import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Save } from 'lucide-react';
import { getCustomers, getStock, saveCustomer, getSettings } from '@/utils/db';
import VehicleInvoiceItemsTable from './VehicleInvoiceItemsTable';
import CustomerForm from '@/components/Customers/CustomerForm';
import CustomerSearch from './CustomerSearch';
import StockSearch from './StockSearch';
import { numberToWords } from '@/utils/numberToWords';
import useShowroomStore from '@/stores/showroomStore';

const VehicleInvoiceForm = ({ onSave, onCancel }) => {
  const formData = useShowroomStore(state => state);
  const { setFormData, setSelectedCustomer, addItem, removeItem, setCustomerDetails, setExtraCharges } = useShowroomStore();
  
  const [customers, setCustomers] = useState([]);
  const [stock, setStock] = useState([]);
  const [settings, setSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const { toast } = useToast();

  const refreshData = useCallback(async () => {
    try {
      const { data: customerData } = await getCustomers({ pageSize: 9999 });
      const [stockResponse, settingsData] = await Promise.all([
        getStock(),
        getSettings()
      ]);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setStock(Array.isArray(stockResponse.data) ? stockResponse.data : []);
      setSettings(settingsData);
    } catch (error) {
      toast({ title: "Error", description: `Failed to load initial data: ${error.message}`, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  useEffect(() => {
      if (formData.customer_id && customers.length > 0 && !formData.selectedCustomer) {
          const cust = customers.find(c => c.id === formData.customer_id);
          if (cust) {
              setSelectedCustomer(cust);
          }
      }
  }, [formData.customer_id, customers, formData.selectedCustomer, setSelectedCustomer]);


  const handleCustomerSelect = useCallback((customer) => {
    setSelectedCustomer(customer);
  }, [setSelectedCustomer]);
  
  const calculateTotals = useCallback(() => {
    const itemsTotal = (Array.isArray(formData.items) ? formData.items : []).reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const discount = parseFloat(item.discount || 0);
      return sum + (price - discount);
    }, 0);
    const extraChargesTotal = Object.values(formData.extra_charges || {}).reduce((sum, charge) => sum + parseFloat(charge || 0), 0);
    const grandTotal = itemsTotal + extraChargesTotal;
    setFormData({ total_amount: grandTotal });
  }, [formData.items, formData.extra_charges, setFormData]);


  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const handleItemAdd = (itemToAdd) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : [];
    if (currentItems.some(item => item.chassis_no === itemToAdd.chassis_no)) {
      toast({ title: "Item already added", description: "This vehicle is already in the invoice.", variant: "destructive" });
      return;
    }
    const newItem = { ...itemToAdd, gst: itemToAdd.gst || '28', discount: 0 };
    addItem(newItem);
  };

  const handleItemRemove = (itemToRemove) => {
    removeItem(itemToRemove.chassis_no);
  };

  const getActiveFields = useCallback(() => {
    if (!settings || !formData.selectedCustomer) return [];
    
    const isRegistered = !!formData.selectedCustomer.gst;
    const fieldsConfig = isRegistered 
      ? settings.registeredCustomerFields 
      : settings.nonRegisteredCustomerFields;

    return Object.entries(fieldsConfig || {})
      .filter(([, value]) => value.enabled)
      .map(([key, config]) => ({ key, ...config }));
  }, [settings, formData.selectedCustomer]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.selectedCustomer) {
      newErrors.customer = "Please select a customer.";
    }
    if (!Array.isArray(formData.items) || formData.items.length === 0) {
      newErrors.items = "At least one item must be added.";
    }
    
    const activeFields = getActiveFields();
    activeFields.forEach(field => {
      if (field.mandatory && !formData.customer_details?.[field.key]) {
        newErrors[field.key] = `${field.label || field.key} is mandatory.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      toast({ title: "Save Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleExtraChargeChange = (chargeName, value) => {
    setExtraCharges({ [chargeName]: value });
  };

  const handleCustomFieldChange = (field, value) => {
    setCustomerDetails({ [field]: value });
  };

  const handleNewCustomerSave = async (customerData) => {
      try {
        const newCustomer = await saveCustomer(customerData);
        toast({title: "Customer created", description: "You can now select the new customer."});
        setShowCustomerForm(false);
        await refreshData();
        if (newCustomer) {
          handleCustomerSelect(newCustomer);
        }
      } catch (error) {
        toast({title: "Error", description: `Failed to save customer: ${error.message}`, variant: "destructive"});
      }
  }

  const availableStock = useMemo(() => {
    const currentItems = Array.isArray(formData.items) ? formData.items : [];
    const selectedChassisNos = currentItems.map(i => i.chassis_no);
    return stock.filter(s => !selectedChassisNos.includes(s.chassis_no));
  }, [stock, formData.items]);
  
  const handleInvoiceDateChange = (e) => {
      const newDate = e.target.value;
      setFormData({ invoice_date: newDate });
  };

  if (!settings) return <div>Loading form...</div>;
  
  if (showCustomerForm) {
      return (<div className="p-8"><CustomerForm onSave={handleNewCustomerSave} onCancel={() => setShowCustomerForm(false)} /></div>);
  }

  const activeCustomFields = getActiveFields();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{formData.id ? 'Edit Vehicle Invoice' : 'Create New Vehicle Invoice'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Invoice No</Label><Input value={formData.invoice_no || '(Will be generated on save)'} disabled /></div>
              <div><Label>Invoice Date</Label><Input type="date" value={formData.invoice_date} onChange={handleInvoiceDateChange} /></div>
              <div className="relative">
                <Label>Party Name *</Label>
                <div className="flex gap-2">
                    <CustomerSearch customers={customers} onCustomerSelect={handleCustomerSelect} selectedCustomer={formData.selectedCustomer} />
                    <Button type="button" variant="outline" onClick={() => setShowCustomerForm(true)}><PlusCircle className="w-4 h-4" /></Button>
                </div>
                {errors.customer && <p className="text-red-500 text-sm mt-1">{errors.customer}</p>}
              </div>
            </div>
            
            {formData.selectedCustomer && (
                 <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-lg mb-2 text-black dark:text-white">{formData.selectedCustomer.customer_name}</h4>
                    <div className="text-sm text-black dark:text-gray-300 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <p><strong className="text-black dark:text-white">Guardian:</strong> {formData.selectedCustomer.guardian_name || 'N/A'}</p>
                        <p><strong className="text-black dark:text-white">Mobile:</strong> {formData.selectedCustomer.mobile1}</p>
                        <p><strong className="text-black dark:text-white">GST:</strong> {formData.selectedCustomer.gst || 'N/A'}</p>
                        <p className="md:col-span-2"><strong className="text-black dark:text-white">Address:</strong> {formData.selectedCustomer.address}, {formData.selectedCustomer.district}, {formData.selectedCustomer.state} - {formData.selectedCustomer.pincode}</p>
                    </div>
                 </motion.div>
            )}

            {formData.selectedCustomer && activeCustomFields.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Additional Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCustomFields.map(field => (
                    <div key={field.key}>
                      <Label>{field.label || field.key} {field.mandatory && '*'}</Label>
                      <Input value={formData.customer_details?.[field.key] || ''} onChange={(e) => handleCustomFieldChange(field.key, e.target.value)} />
                      {errors[field.key] && <p className="text-red-500 text-sm mt-1">{errors[field.key]}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Items</h3>
                <StockSearch stock={availableStock} onAddItem={handleItemAdd} />
              </div>
              <VehicleInvoiceItemsTable
                items={Array.isArray(formData.items) ? formData.items : []}
                setItems={items => setFormData({ items })}
                onRemoveItem={handleItemRemove}
                taxCalculation={settings?.workshop_settings?.tax_calculation || 'inclusive'}
              />
              {errors.items && <p className="text-red-500 text-sm mt-1">{errors.items}</p>}
            </div>
            
            <Card>
                <CardHeader><CardTitle className="text-base">Extra Charges</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(settings?.workshop_settings?.extra_charges || []).map(charge => (
                        <div key={charge.id}>
                            <Label>{charge.name}</Label>
                            <Input 
                                type="number" 
                                value={formData.extra_charges?.[charge.name] || ''} 
                                onChange={e => handleExtraChargeChange(charge.name, e.target.value)} 
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">Grand Total: ₹{formData.total_amount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{numberToWords(formData.total_amount)}</div>
              </div>
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Saving...' : (formData.id ? 'Update Invoice' : 'Create Invoice')}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default VehicleInvoiceForm;