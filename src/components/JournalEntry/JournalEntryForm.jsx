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
import useJournalEntryStore from '@/stores/journalEntryStore';
import { useToast } from '@/components/ui/use-toast';
import { saveJournalEntry, searchChassisForJournal } from '@/utils/db/journalEntries';
import { getCustomers } from '@/utils/db/customers';
import { getPriceList } from '@/utils/db/priceList';
import { getJournalEntrySettings } from '@/utils/db/journalEntrySettings';
import { supabase } from '@/lib/customSupabaseClient';
import AutocompleteInput from '@/components/common/AutocompleteInput';

const JournalEntryForm = () => {
  const { formData, setFormData, resetForm, isEditing, setActiveTab } = useJournalEntryStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [priceList, setPriceList] = useState([]);
  const [priceFields, setPriceFields] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');

  useEffect(() => {
    getPriceList().then(setPriceList).catch(console.error);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const settings = await getJournalEntrySettings(user.id);
      setPriceFields(settings.price_fields.filter(f => f.enabled));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const searchCustomers = async (term) => {
    if (!term) return;
    const { data } = await getCustomers({ searchTerm: term, pageSize: 20 });
    setCustomers(data || []);
  };

  const searchVehicles = async (term) => {
    if (!term || term.length < 2) {
      setVehicles([]);
      return;
    }
    try {
      console.log('Searching vehicles for:', term);
      const data = await searchChassisForJournal(term);
      console.log('Vehicle search results:', data);
      setVehicles(data || []);
    } catch (error) {
      console.error('Error searching vehicles:', error);
      toast({
        variant: 'destructive',
        title: 'Search Error',
        description: error.message,
      });
      setVehicles([]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleDateChange = (date) => {
    handleInputChange('entry_date', format(date, 'yyyy-MM-dd'));
  };

  const handleCustomerSelect = (customer) => {
    const name = typeof customer === 'string' ? customer : customer.customer_name;
    setFormData({
      ...formData,
      party_id: customer.id || null,
      party_name: name,
    });
  };

  const handleVehicleSelect = (vehicle) => {
    if (typeof vehicle === 'string') {
      setFormData({ ...formData, chassis_no: vehicle });
      setVehicleSearch('');
      return;
    }
    setFormData({
      ...formData,
      chassis_no: vehicle.chassis_no || '',
      model_name: vehicle.model_name || '',
      invoice_no: vehicle.invoice_no || '',
    });
    setVehicleSearch('');
    setVehicles([]);
  };

  const handlePriceChange = (fieldId, value) => {
    const breakdown = formData.price_breakdown || {};
    breakdown[fieldId] = parseFloat(value) || 0;
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    setFormData({ ...formData, price_breakdown: breakdown, price: total });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.entry_type || !formData.entry_date || !formData.party_name) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Entry Type, Date, and Party Name are required.',
      });
      return;
    }
    if (isEditing && (!formData.remark || formData.remark.trim() === '')) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Remark is mandatory when editing an entry.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await saveJournalEntry(formData);
      toast({
        title: 'Success',
        description: `Journal entry ${isEditing ? 'updated' : 'saved'} successfully.`,
      });
      resetForm();
      setActiveTab('list');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to save journal entry: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit' : 'New'} Journal Entry</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_type">Entry Type *</Label>
              <Select
                name="entry_type"
                value={formData.entry_type || ''}
                onValueChange={(value) => handleInputChange('entry_type', value)}
                required
              >
                <SelectTrigger id="entry_type">
                  <SelectValue placeholder="Select entry type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entry_date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn('w-full justify-start text-left font-normal', !formData.entry_date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.entry_date ? format(new Date(formData.entry_date), 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.entry_date ? new Date(formData.entry_date) : null}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <AutocompleteInput
              label="Party Name"
              value={formData.party_name || ''}
              onChange={(value) => {
                handleInputChange('party_name', value);
                searchCustomers(value);
              }}
              onSelect={handleCustomerSelect}
              suggestions={customers.map(c => ({ label: c.customer_name, ...c }))}
              placeholder="Search by name or mobile..."
              required
            />
          </div>
          <div>
            <Label>Search Vehicle (Optional)</Label>
            <AutocompleteInput
              value={vehicleSearch}
              onChange={(value) => {
                setVehicleSearch(value);
                searchVehicles(value);
              }}
              onSelect={handleVehicleSelect}
              suggestions={vehicles.map(v => ({ 
                label: `${v.chassis_no || ''} - ${v.model_name || ''} (${v.invoice_no || ''})`, 
                ...v 
              }))}
              placeholder="Type chassis/engine/invoice to search..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="chassis_no">Chassis No</Label>
              <Input 
                id="chassis_no" 
                name="chassis_no" 
                value={formData.chassis_no || ''} 
                onChange={(e) => handleInputChange('chassis_no', e.target.value)} 
                placeholder="Enter manually or search above"
              />
            </div>
            <div>
              <Label htmlFor="model_name">Model Name</Label>
              <Input 
                id="model_name" 
                name="model_name" 
                value={formData.model_name || ''} 
                onChange={(e) => handleInputChange('model_name', e.target.value)} 
                placeholder="Enter manually or search above"
              />
            </div>
            <div>
              <Label htmlFor="invoice_no">Invoice No</Label>
              <Input 
                id="invoice_no" 
                name="invoice_no" 
                value={formData.invoice_no || ''} 
                onChange={(e) => handleInputChange('invoice_no', e.target.value)} 
                placeholder="Enter manually or search above"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="particulars">Particulars</Label>
            <Input
              id="particulars"
              name="particulars"
              value={formData.particulars || ''}
              onChange={(e) => handleInputChange('particulars', e.target.value)}
              placeholder="Enter transaction details manually"
            />
          </div>
          <div className="space-y-3">
            <Label>Price Breakdown</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {priceFields.map(field => (
                <div key={field.id}>
                  <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                  <Input
                    id={field.id}
                    type="number"
                    value={formData.price_breakdown?.[field.id] || ''}
                    onChange={(e) => handlePriceChange(field.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Label className="font-semibold">Total Price:</Label>
              <Input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="w-40"
              />
            </div>
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
          {isEditing && (
            <div>
              <Label htmlFor="remark">Remark (Mandatory for edit)</Label>
              <Textarea
                id="remark"
                name="remark"
                value={formData.remark || ''}
                onChange={(e) => handleInputChange('remark', e.target.value)}
                required={isEditing}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => { resetForm(); setActiveTab('list'); }}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Entry' : 'Save Entry'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default JournalEntryForm;
