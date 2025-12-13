import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import useReceiptStore from '@/stores/receiptStore';
import { useToast } from '@/components/ui/use-toast';
import { saveReceipt } from '@/utils/db/receipts';
import { getCustomers } from '@/utils/db/customers';
import { getJournalEntriesForCustomer } from '@/utils/db/journalEntries';
import { useDebounce } from '@/hooks/useDebounce';

const AutocompleteCustomerSearch = ({ onSelect, initialValue, onClear }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue?.customer_name || '');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setIsLoading(true);
      getCustomers({ searchTerm: debouncedSearchTerm, pageSize: 10 })
        .then(({ data }) => {
          setResults(data);
          setIsLoading(false);
          setIsOpen(true);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    } else {
      setResults([]);
      setIsOpen(false);
      onClear();
    }
  }, [debouncedSearchTerm]);

  const handleSelect = (customer) => {
    setSearchTerm(customer.customer_name);
    onSelect(customer);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search by name or mobile..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(results.length > 0)}
      />
      {isOpen && (
        <div className="absolute z-10 w-full bg-card border rounded-md mt-1 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center">Loading...</div>
          ) : results.length > 0 ? (
            results.map((customer) => (
              <div
                key={customer.id}
                className="p-2 hover:bg-accent cursor-pointer"
                onClick={() => handleSelect(customer)}
              >
                {customer.customer_name} ({customer.mobile1})
              </div>
            ))
          ) : (
            <div className="p-2 text-center text-muted-foreground">No customers found.</div>
          )}
        </div>
      )}
    </div>
  );
};

const ReceiptForm = () => {
  const { formData, setFormData, resetForm, isEditing, setActiveTab } = useReceiptStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [journalEntries, setJournalEntries] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    if (formData.customer_id) {
      getJournalEntriesForCustomer(formData.customer_id)
        .then(entries => {
          // Filter only Debit entries
          const debitEntries = entries.filter(e => e.entry_type === 'Debit');
          setJournalEntries(debitEntries);
        })
        .catch(console.error);
    } else {
      setJournalEntries([]);
    }
  }, [formData.customer_id]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleDateChange = (date) => {
    handleInputChange('receipt_date', format(date, 'yyyy-MM-dd'));
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.customer_name,
    });
  };

  const handleJournalEntrySelect = (journalEntryId) => {
    const entry = journalEntries.find(e => e.id === journalEntryId);
    if (entry) {
      setFormData({
        ...formData,
        journal_entry_id: entry.id,
        amount: entry.price,
        narration: `Payment against entry for ${entry.particulars} on ${new Date(entry.entry_date).toLocaleDateString()}`,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.receipt_date || !formData.customer_id || !formData.payment_mode || !formData.amount) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Date, Customer, Payment Mode, and Amount are required.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await saveReceipt(formData);
      toast({
        title: 'Success',
        description: `Receipt ${isEditing ? 'updated' : 'saved'} successfully.`,
      });
      resetForm();
      setActiveTab('list');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to save receipt: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit' : 'New'} Receipt</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receipt_date">Receipt Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn('w-full justify-start text-left font-normal', !formData.receipt_date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.receipt_date ? format(new Date(formData.receipt_date), 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.receipt_date ? new Date(formData.receipt_date) : null}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <AutocompleteCustomerSearch
                onSelect={handleCustomerSelect}
                initialValue={selectedCustomer}
                onClear={() => {
                  setSelectedCustomer(null);
                  setFormData({ ...formData, customer_id: null, customer_name: '' });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_mode">Payment Mode *</Label>
              <Select
                name="payment_mode"
                value={formData.payment_mode || ''}
                onValueChange={(value) => handleInputChange('payment_mode', value)}
                required
              >
                <SelectTrigger id="payment_mode">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="journal_entry">Ledger Reference (Optional)</Label>
            <Select
              name="journal_entry"
              value={formData.journal_entry_id || ''}
              onValueChange={handleJournalEntrySelect}
              disabled={!formData.customer_id || journalEntries.length === 0}
            >
              <SelectTrigger id="journal_entry">
                <SelectValue placeholder="Select a journal entry to link" />
              </SelectTrigger>
              <SelectContent>
                {journalEntries.map(entry => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {new Date(entry.entry_date).toLocaleDateString()} - {entry.particulars}
                    {entry.chassis_no && ` | ${entry.chassis_no}`}
                    {entry.model_name && ` | ${entry.model_name}`}
                    {entry.invoice_no && ` | ${entry.invoice_no}`}
                    {` (₹${entry.price})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="narration">Narration</Label>
            <Textarea
              id="narration"
              name="narration"
              value={formData.narration || ''}
              onChange={(e) => handleInputChange('narration', e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => { resetForm(); setActiveTab('list'); }}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Receipt' : 'Save Receipt'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ReceiptForm;