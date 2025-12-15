import React, { useState, useCallback, useEffect, useRef } from 'react';
import '@/styles/responsive.css';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getSalesReturns, saveSalesReturn, deleteSalesReturn, addStock, deleteStockByChassis } from '@/utils/db';
import { getCurrentDate, formatDate, getCurrentMonthDateRange } from '@/utils/dateUtils';
import { exportToExcel } from '@/utils/excel';
import { useAuth } from '@/contexts/NewSupabaseAuthContext';
import SalesReturnForm from '@/components/SalesReturns/SalesReturnForm';
import SalesReturnList from '@/components/SalesReturns/SalesReturnList';
import useSalesReturnStore from '@/stores/salesReturnStore';
import { supabase } from '@/lib/customSupabaseClient';

const SalesReturnPage = () => {
    const [view, setView] = useState('list');
    const [returns, setReturns] = useState([]);
    const [editingReturn, setEditingReturn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const { canAccess } = useAuth();
    const searchDebounceTimeout = useRef(null);
    const PAGE_SIZE = 10;
    const resetForm = useSalesReturnStore(state => state.resetForm);

    const initialDateRange = getCurrentMonthDateRange();
    const [dateRange, setDateRange] = useState({ start: initialDateRange.start, end: initialDateRange.end });


    const fetchReturns = useCallback(async (page = currentPage, term = searchTerm, range = dateRange) => {
        setLoading(true);
        try {
            const { data, count } = await getSalesReturns({ page, pageSize: PAGE_SIZE, searchTerm: term, dateRange: range });
            setReturns(Array.isArray(data) ? data : []);
            setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
        } catch (error) {
            toast({ title: 'Error', description: 'Could not fetch sales returns.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, dateRange, toast]);

    useEffect(() => {
        clearTimeout(searchDebounceTimeout.current);
        searchDebounceTimeout.current = setTimeout(() => {
            setCurrentPage(1);
            fetchReturns(1, searchTerm, dateRange);
        }, 500);
    }, [searchTerm, fetchReturns]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchReturns(1, searchTerm, dateRange);
    };

    useEffect(() => {
        fetchReturns(1, searchTerm, dateRange);
    }, []);

    const handleSave = async (returnData) => {
        try {
            await saveSalesReturn(returnData);
            
            const stockItems = (Array.isArray(returnData.items) ? returnData.items : []).map(item => ({
                model_name: item.model_name,
                chassis_no: item.chassis_no,
                engine_no: item.engine_no,
                colour: item.colour,
                price: item.price || '0',
                purchase_date: returnData.return_date,
                hsn: item.hsn,
                gst: item.gst,
                category: item.category || null
            }));
            
            await addStock(stockItems);
            
            // Mark original invoice as returned
            const { error: updateError } = await supabase
                .from('vehicle_invoices')
                .update({ status: 'returned' })
                .eq('id', returnData.original_invoice_id);
            
            if (updateError) {
                console.error('Failed to update invoice status:', updateError);
            }

            toast({ title: "Success", description: "Sales return saved and stock updated." });
            setView('list');
            setEditingReturn(null);
            fetchReturns(1, '', { start: '', end: '' });
        } catch (error) {
            console.error('Sales return save error:', error);
            toast({ title: "Error", description: `Failed to save sales return: ${error.message}`, variant: "destructive" });
        }
    };
    
    const handleDelete = async (returnToDelete) => {
        if(window.confirm("Are you sure? This will delete the sales return and remove items from stock.")) {
            try {
                const chassisNos = (Array.isArray(returnToDelete.items) ? returnToDelete.items : []).map(item => item.chassis_no);
                if (chassisNos.length > 0) {
                    await deleteStockByChassis(chassisNos);
                }

                await deleteSalesReturn(returnToDelete.id);
                toast({ title: "Success", description: "Sales return deleted and stock updated." });
                fetchReturns(currentPage, searchTerm, dateRange);
            } catch (error) {
                toast({ title: "Error", description: `Failed to delete sales return: ${error.message}`, variant: "destructive" });
            }
        }
    };
    
    const handleExport = async () => {
        try {
            const { data: allReturns } = await getSalesReturns({
                page: 1,
                pageSize: 9999, // Fetch all matching records
                searchTerm,
                dateRange,
            });

            if (!allReturns || allReturns.length === 0) {
                toast({ title: "No Data", description: "No data to export for the current filters." });
                return;
            }

            const excelData = allReturns.flatMap(r => 
                (Array.isArray(r.items) ? r.items : []).map(item => ({
                    "Return Invoice No": r.return_invoice_no,
                    "Return Date": formatDate(r.return_date),
                    "Customer Name": r.customer_name,
                    "Original Invoice No": r.vehicle_invoices?.invoice_no || 'N/A',
                    "Reason": r.reason,
                    "Model Name": item.model_name,
                    "Chassis No": item.chassis_no,
                    "Engine No": item.engine_no,
                    "Colour": item.colour,
                    "Price": item.price,
                }))
            );

            exportToExcel(excelData, `Sales_Returns_${getCurrentDate()}`);
            toast({ title: "Export Successful", description: "Sales returns have been exported." });
        } catch (error) {
            toast({ title: "Export Error", description: `Could not export data: ${error.message}`, variant: "destructive" });
        }
    };

    const handleEdit = (ret) => {
        setEditingReturn(ret);
        setView('form');
    };
    
    const handleCancel = () => {
        setView('list');
        setEditingReturn(null);
        resetForm();
    }

    return (
        <>
            <Helmet>
                <title>Sales Returns - Showroom Pro</title>
            </Helmet>
            <div className="space-y-4">
                {view === 'list' && (
                    <div className="flex justify-between items-center">
                        <h1 className="page-title">Sales Returns Management</h1>
                        {canAccess('sales_returns', 'write') && (
                            <Button onClick={() => { setEditingReturn(null); resetForm(); setView('form'); }}><Plus className="w-4 h-4 mr-2" /> New Sales Return</Button>
                        )}
                    </div>
                )}
                {view === 'list' ? (
                    <SalesReturnList 
                        returns={returns} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                        loading={loading} 
                        totalPages={totalPages} 
                        currentPage={currentPage} 
                        onPageChange={(page) => {
                            setCurrentPage(page);
                            fetchReturns(page, searchTerm, dateRange);
                        }}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        onExport={handleExport}
                    />
                ) : (
                    <SalesReturnForm onSave={handleSave} onCancel={handleCancel} existingReturn={editingReturn} />
                )}
            </div>
        </>
    );
};

export default SalesReturnPage;