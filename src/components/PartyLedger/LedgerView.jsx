import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileDown, FileText } from 'lucide-react';
import { getCustomers } from '@/utils/db/customers';
import { getPartyLedger } from '@/utils/db/journalEntries';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/use-toast';
import { exportToExcel } from '@/utils/excel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateRangePicker } from '@/components/ui/daterangepicker';
import { getCurrentMonthDateRange } from '@/utils/dateUtils';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import AutocompleteInput from '@/components/common/AutocompleteInput';

const LedgerView = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(() => {
    const { start, end } = getCurrentMonthDateRange();
    return { from: new Date(start), to: new Date(end) };
  });
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      getCustomers({ searchTerm: debouncedSearchTerm, pageSize: 20 })
        .then(({ data }) => {
          setCustomerSuggestions(data.map(c => ({ ...c, label: `${c.customer_name} (${c.mobile1})` })));
        })
        .catch(err => console.error(err));
    } else {
      setCustomerSuggestions([]);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (selectedCustomer && dateRange?.from && dateRange?.to) {
      setIsLoading(true);
      getPartyLedger(selectedCustomer.id, dateRange.from, dateRange.to)
        .then(data => {
          setLedgerData(data);
          setIsLoading(false);
        })
        .catch(error => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to fetch ledger: ${error.message}`,
          });
          setIsLoading(false);
        });
    } else {
      setLedgerData([]);
    }
  }, [selectedCustomer, dateRange, toast]);

  const calculateBalance = () => {
    let balance = 0;
    return ledgerData.map(entry => {
      balance += (entry.debit || 0) - (entry.credit || 0);
      return { ...entry, balance };
    });
  };

  const ledgerWithBalance = calculateBalance();
  const paginatedData = ledgerWithBalance.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(ledgerWithBalance.length / pageSize);
  const finalBalance = ledgerWithBalance.length > 0 ? ledgerWithBalance[ledgerWithBalance.length - 1].balance : 0;

  const handleExportExcel = async () => {
    if (!selectedCustomer) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Please select a customer.' });
      return;
    }
    
    try {
      setIsLoading(true);
      const allData = await getPartyLedger(selectedCustomer.id, dateRange.from, dateRange.to);
      
      if (!allData || allData.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No data to export.' });
        return;
      }

      let balance = 0;
      const dataWithBalance = allData.map(entry => {
        balance += (entry.debit || 0) - (entry.credit || 0);
        return { ...entry, balance };
      });

      const dataToExport = dataWithBalance.map(entry => {
        const breakdown = entry.price_breakdown || {};
        return {
          'Date': new Date(entry.transaction_date).toLocaleDateString(),
          'Party Name': selectedCustomer.customer_name,
          'Model Name': entry.model_name || '',
          'Chassis No': entry.chassis_no || '',
          'Invoice No': entry.invoice_no || '',
          'Particulars': entry.particulars || '',
          'Vehicle Price': breakdown.vehicle_price || 0,
          'RTO Price': breakdown.rto_price || 0,
          'Insurance Price': breakdown.insurance_price || 0,
          'Accessories Price': breakdown.accessories_price || 0,
          'Extended Warranty Price': breakdown.warranty_price || 0,
          'Debit': (entry.debit || 0).toFixed(2),
          'Credit': (entry.credit || 0).toFixed(2),
          'Balance': `${Math.abs(entry.balance).toFixed(2)} ${entry.balance >= 0 ? 'Dr' : 'Cr'}`,
        };
      });
      
      const closingBalance = dataWithBalance[dataWithBalance.length - 1]?.balance || 0;
      dataToExport.push({ 
        'Particulars': 'CLOSING BALANCE', 
        'Balance': `${Math.abs(closingBalance).toFixed(2)} ${closingBalance >= 0 ? 'Dr' : 'Cr'}` 
      });
      
      exportToExcel(dataToExport, `Ledger_${selectedCustomer.customer_name.replace(/\s/g, '_')}`);
      toast({ title: 'Success', description: `Exported ${allData.length} transactions` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedCustomer) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Please select a customer.' });
      return;
    }
    
    try {
      setIsLoading(true);
      const allData = await getPartyLedger(selectedCustomer.id, dateRange.from, dateRange.to);
      
      if (!allData || allData.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No data to export.' });
        return;
      }

      let balance = 0;
      const dataWithBalance = allData.map(entry => {
        balance += (entry.debit || 0) - (entry.credit || 0);
        return { ...entry, balance };
      });

      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text(`Party Ledger - ${selectedCustomer.customer_name}`, 14, 16);
      doc.setFontSize(10);
      doc.text(`Period: ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`, 14, 22);
      
      autoTable(doc, {
        head: [['Date', 'Party', 'Model', 'Chassis', 'Invoice', 'Particulars', 'Vehicle', 'RTO', 'Insurance', 'Accessories', 'Warranty', 'Debit', 'Credit', 'Balance']],
        body: dataWithBalance.map(e => {
          const breakdown = e.price_breakdown || {};
          return [
            new Date(e.transaction_date).toLocaleDateString(),
            selectedCustomer.customer_name,
            e.model_name || '',
            e.chassis_no || '',
            e.invoice_no || '',
            e.particulars || '',
            breakdown.vehicle_price || 0,
            breakdown.rto_price || 0,
            breakdown.insurance_price || 0,
            breakdown.accessories_price || 0,
            breakdown.warranty_price || 0,
            (e.debit || 0).toFixed(2),
            (e.credit || 0).toFixed(2),
            `${Math.abs(e.balance).toFixed(2)} ${e.balance >= 0 ? 'Dr' : 'Cr'}`
          ];
        }),
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], fontSize: 7 },
        bodyStyles: { fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 18 },
          5: { cellWidth: 30 },
          6: { cellWidth: 15, halign: 'right' },
          7: { cellWidth: 15, halign: 'right' },
          8: { cellWidth: 15, halign: 'right' },
          9: { cellWidth: 15, halign: 'right' },
          10: { cellWidth: 15, halign: 'right' },
          11: { cellWidth: 18, halign: 'right' },
          12: { cellWidth: 18, halign: 'right' },
          13: { cellWidth: 20, halign: 'right' }
        }
      });
      
      const closingBalance = dataWithBalance[dataWithBalance.length - 1]?.balance || 0;
      const finalY = doc.lastAutoTable.finalY || 28;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(
        `Closing Balance: ${Math.abs(closingBalance).toFixed(2)} ${closingBalance >= 0 ? 'Dr' : 'Cr'}`, 
        14, 
        finalY + 10
      );
      
      doc.save(`Ledger_${selectedCustomer.customer_name.replace(/\s/g, '_')}.pdf`);
      toast({ title: 'Success', description: 'PDF downloaded successfully' });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({ variant: 'destructive', title: 'PDF Export Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Customer</CardTitle>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="w-full md:w-1/3">
            <AutocompleteInput
              value={searchTerm}
              onChange={setSearchTerm}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setSearchTerm(customer.customer_name);
              }}
              suggestions={customerSuggestions}
              placeholder="Search by customer name or mobile..."
            />
          </div>
          <div className="w-full md:w-auto">
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
          </div>
          <Button onClick={handleExportExcel} disabled={!selectedCustomer || ledgerData.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handleExportPdf} disabled={!selectedCustomer || ledgerData.length === 0}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedCustomer && (
          <div className="mb-4">
            <h3 className="text-xl font-semibold">{selectedCustomer.customer_name}</h3>
            <p className="text-muted-foreground">{selectedCustomer.address}</p>
            <p className="text-muted-foreground">Mobile: {selectedCustomer.mobile1}</p>
          </div>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Vehicle Details</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Price Breakdown</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((entry, index) => {
                  const breakdown = entry.price_breakdown || {};
                  return (
                    <TableRow key={index}>
                      <TableCell>{new Date(entry.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell>{selectedCustomer.customer_name}</TableCell>
                      <TableCell>{entry.model_name || entry.chassis_no ? `${entry.model_name || ''} / ${entry.chassis_no || ''}`.trim() : '-'}</TableCell>
                      <TableCell>{entry.particulars}</TableCell>
                      <TableCell className="text-xs">
                        {breakdown.vehicle_price || breakdown.rto_price || breakdown.insurance_price || breakdown.accessories_price || breakdown.warranty_price ? (
                          <div className="space-y-0.5">
                            {breakdown.vehicle_price > 0 && <div>Vehicle: ₹{breakdown.vehicle_price}</div>}
                            {breakdown.rto_price > 0 && <div>RTO: ₹{breakdown.rto_price}</div>}
                            {breakdown.insurance_price > 0 && <div>Insurance: ₹{breakdown.insurance_price}</div>}
                            {breakdown.accessories_price > 0 && <div>Accessories: ₹{breakdown.accessories_price}</div>}
                            {breakdown.warranty_price > 0 && <div>Warranty: ₹{breakdown.warranty_price}</div>}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{(entry.debit || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{(entry.credit || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.abs(entry.balance).toFixed(2)} {entry.balance >= 0 ? 'Dr' : 'Cr'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {selectedCustomer ? 'No transactions found for this customer in the selected date range.' : 'Please select a customer to view their ledger.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({ledgerWithBalance.length} total entries)
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} 
                    className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {page}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} 
                    className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        {ledgerWithBalance.length > 0 && (
          <div className="mt-4 text-right font-bold text-lg">
            Closing Balance: {Math.abs(finalBalance).toFixed(2)} {finalBalance >= 0 ? 'Dr' : 'Cr'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LedgerView;