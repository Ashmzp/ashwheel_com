import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload } from 'lucide-react';
import { validateRequired } from '@/utils/validation';
import { getCustomers } from '@/utils/db/customers';
import { getPurchases } from '@/utils/db/purchases';
import { parseExcelData } from '@/utils/excel';
import PurchaseItemsTable from './PurchaseItemsTable';
import usePurchaseStore from '@/stores/purchaseStore';
import useSettingsStore from '@/stores/settingsStore';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/NewSupabaseAuthContext';
import { useQuery } from '@tanstack/react-query';

const PurchaseForm = ({ onSave, onCancel, editingPurchase }) => {
  const {
    id,
    created_at,
    serial_no,
    invoiceDate,
    invoiceNo,
    partyName,
    items,
    setFormData,
    setItems: setItemsInStore,
    addItem,
  } = usePurchaseStore();
  const { user, isExpired } = useAuth();
  const purchaseItemFields = useSettingsStore((state) => state.settings.purchaseItemFields || {});
  const purchaseCustomFields = useSettingsStore((state) => state.settings.purchaseCustomFields || []);
  
  const [partyNameSearch, setPartyNameSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstLoadRef = useRef(false);
  const { toast } = useToast();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', partyNameSearch],
    queryFn: () => getCustomers({ searchTerm: partyNameSearch, pageSize: 10 }).then(res => res.data),
    enabled: !!partyNameSearch && showSuggestions,
    staleTime: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    setPartyNameSearch(partyName || '');
  }, [partyName]);

  // Load edit data into store
  useEffect(() => {
    if (editingPurchase && !id) {
      setFormData({
        id: editingPurchase.id,
        created_at: editingPurchase.created_at,
        serial_no: editingPurchase.serial_no,
        invoiceDate: editingPurchase.invoice_date,
        invoiceNo: editingPurchase.invoice_no,
        partyName: editingPurchase.party_name,
      });
      // Convert DB snake_case to frontend camelCase
      const convertedItems = (editingPurchase.items || []).map(item => ({
        id: Date.now().toString() + Math.random(),
        modelName: item.model_name,
        chassisNo: item.chassis_no,
        engineNo: item.engine_no,
        colour: item.colour,
        category: item.category,
        price: item.price,
        hsn: item.hsn,
        gst: item.gst_rate || item.gst,
      }));
      setItemsInStore(convertedItems);
    }
  }, [editingPurchase, id, setFormData, setItemsInStore]);

  const getNextSerialNo = useCallback(async () => {
    if (id) return; // Skip if editing
    // Serial number will be handled by backend
    setFormData({ serial_no: 'Auto' });
  }, [setFormData, id]);

  useEffect(() => {
    if (!firstLoadRef.current && user?.id) {
      firstLoadRef.current = true;
      
      if (!id) {
        getNextSerialNo();
      }
    }
  }, [user?.id, getNextSerialNo, id]);

  const handlePartyNameChange = (e) => {
    const term = e.target.value;
    setPartyNameSearch(term);
    setShowSuggestions(true);
    setFormData({ partyName: term });
  };

  const handleCustomerSelect = (customer) => {
    setPartyNameSearch(customer.customer_name);
    setFormData({ partyName: customer.customer_name });
    setShowSuggestions(false);
  };

  const handleExcelImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const importedData = await parseExcelData(file);
      
      const { data: purchasesResult } = await getPurchases({pageSize: 10000});
      const allChassisNos = purchasesResult.flatMap(p => (p.items || []).map(item => item.chassis_no?.toUpperCase()));

      let newItemsCount = 0;
      importedData.forEach((row, index) => {
        const itemData = { id: Date.now().toString() + index };
        
        // Map default fields
        Object.entries(purchaseItemFields).forEach(([key, field]) => {
          if (field.enabled) {
            const value = row[field.label] || '';
            if (key === 'chassisNo' || key === 'engineNo') {
              itemData[key] = value.toString().toUpperCase();
            } else if (key === 'price') {
              itemData[key] = value || '0';
            } else {
              itemData[key] = value || null;
            }
          }
        });
        
        // Map custom fields
        purchaseCustomFields.forEach(field => {
          if (field.name) {
            itemData[`custom_${field.id}`] = row[field.name] || '';
          }
        });
        
        const chassisNo = itemData.chassisNo || '';
        if (chassisNo && !allChassisNos.includes(chassisNo) && !items.some(i => i.chassisNo === chassisNo)) {
          addItem(itemData);
          newItemsCount++;
        }
      });

      if (newItemsCount > 0) {
        toast({ title: "Import Successful", description: `${newItemsCount} items imported.` });
      } else {
        toast({ title: "Import Info", description: "No new valid items found to import.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Import Error", description: `Failed to parse file. ${error.message}`, variant: "destructive" });
    } finally {
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = [];
    const exampleData = [];
    
    console.log('Purchase Item Fields:', purchaseItemFields);
    console.log('Purchase Custom Fields:', purchaseCustomFields);
    
    // Add default fields
    Object.entries(purchaseItemFields).forEach(([key, field]) => {
      if (field.enabled) {
        headers.push(field.label);
        if (key === 'modelName') exampleData.push('Example Model');
        else if (key === 'chassisNo') exampleData.push('ABC123');
        else if (key === 'engineNo') exampleData.push('ENG123');
        else if (key === 'colour') exampleData.push('Red');
        else if (key === 'price') exampleData.push('100000');
        else if (key === 'hsn') exampleData.push('87112019');
        else if (key === 'gst') exampleData.push('28');
        else if (key === 'category') exampleData.push('Scooter');
        else exampleData.push('Sample');
      }
    });
    
    // Add custom fields
    purchaseCustomFields.forEach(field => {
      if (field.name) {
        headers.push(field.name);
        exampleData.push('Sample Value');
      }
    });
    
    console.log('Template Headers:', headers);
    console.log('Template Data:', exampleData);
    
    const template = `${headers.join(',')}\n${exampleData.join(',')}`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'purchase_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const validateForm = async () => {
    const newErrors = {};
    if (!validateRequired(invoiceDate)) newErrors.invoiceDate = 'Invoice date is required';
    if (!validateRequired(invoiceNo)) newErrors.invoiceNo = 'Invoice number is required';
    if (!validateRequired(partyName)) newErrors.partyName = 'Party name is required';
    if (!items || items.length === 0) newErrors.items = 'At least one item is required';
    
    // Validate items have required fields
    if (items && items.length > 0) {
      const invalidItems = items.filter(item => 
        !item.modelName || !item.chassisNo || !item.price
      );
      if (invalidItems.length > 0) {
        newErrors.items = 'All items must have Model Name, Chassis No, and Price';
      }
    }
    
    if (validateRequired(invoiceNo) && !id) {
        try {
          const { data: existingPurchases, error } = await supabase
              .from('purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('invoice_no', invoiceNo);

          if (error) {
              console.error("Error checking for existing invoice:", error);
          } else if (existingPurchases && existingPurchases.length > 0) {
              newErrors.invoiceNo = 'This invoice number already exists for you.';
          }
        } catch (error) {
          console.error("Validation error:", error);
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) {
      toast({ title: "Validation Error", description: "Please fill all required fields and correct the errors.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      console.log('Submitting purchase with data:', {
        id: id || crypto.randomUUID(),
        serial_no,
        invoiceDate,
        invoiceNo,
        partyName,
        items: items || [],
        created_at: created_at || new Date().toISOString(),
      });
      
      const purchaseData = {
        ...(id ? { id } : {}), // Only include ID if editing
        serial_no,
        invoiceDate,
        invoiceNo,
        partyName,
        items: items || [],
        created_at: created_at || new Date().toISOString(),
      };
      
      await onSave(purchaseData);
      toast({ title: "Success", description: "Purchase saved successfully!" });
    } catch (error) {
      console.error('Form submit error:', error);
      toast({ title: "Error", description: `Failed to save purchase. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Purchase' : 'Add New Purchase'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isExpired && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-md mb-4">
              ⚠️ Your subscription has expired. Form is in READ-ONLY mode.
            </div>
          )}
          <form onSubmit={handleSubmit} className={`space-y-6 ${isExpired ? 'pointer-events-none opacity-60' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="serialNo">Serial No</Label>
                <Input id="serialNo" value={serial_no || ''} disabled />
              </div>
              <div>
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setFormData({ invoiceDate: e.target.value })} className={errors.invoiceDate ? 'border-red-500' : ''} />
                {errors.invoiceDate && <p className="text-red-500 text-sm mt-1">{errors.invoiceDate}</p>}
              </div>
              <div>
                <Label htmlFor="invoiceNo">Invoice No *</Label>
                <Input id="invoiceNo" value={invoiceNo} onChange={(e) => setFormData({ invoiceNo: e.target.value })} className={errors.invoiceNo ? 'border-red-500' : ''} />
                {errors.invoiceNo && <p className="text-red-500 text-sm mt-1">{errors.invoiceNo}</p>}
              </div>
            </div>

            <div className="relative">
              <Label htmlFor="partyName">Party Name *</Label>
              <Input 
                id="partyName" 
                value={partyNameSearch} 
                onChange={handlePartyNameChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
                className={errors.partyName ? 'border-red-500' : ''} 
              />
              {errors.partyName && <p className="text-red-500 text-sm mt-1">{errors.partyName}</p>}
              {showSuggestions && customers.length > 0 && (
                <motion.ul 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 w-full bg-secondary border border-border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg"
                >
                  {customers.map(c => (
                    <li 
                      key={c.id} 
                      className="px-3 py-2 cursor-pointer hover:bg-accent"
                      onMouseDown={() => handleCustomerSelect(c)}
                    >
                      <p className="font-semibold">{c.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{c.mobile1}</p>
                    </li>
                  ))}
                </motion.ul>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Items</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" /> Template</Button>
                  <Button type="button" variant="outline" asChild><label htmlFor="excel-upload" className="cursor-pointer flex items-center"><Upload className="w-4 h-4 mr-2" /> Import Excel</label></Button>
                  <input type="file" id="excel-upload" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleExcelImport} className="hidden" />
                </div>
              </div>
              <PurchaseItemsTable />
              {errors.items && <p className="text-red-500 text-sm mt-1">{errors.items}</p>}
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isExpired}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || isExpired}>{isSubmitting ? 'Saving...' : (id ? 'Update Purchase' : 'Save Purchase')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PurchaseForm;