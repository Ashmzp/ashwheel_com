import React, { useState, memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { validateRequired, validateChassisNo, validateEngineNo } from '@/utils/validation';
import { checkStockExistence } from '@/utils/db/stock';
import usePurchaseStore from '@/stores/purchaseStore';
import useSettingsStore from '@/stores/settingsStore';

const PurchaseItemsTable = memo(() => {
  const items = usePurchaseStore((state) => state.items);
  const addItem = usePurchaseStore((state) => state.addItem);
  const updateItem = usePurchaseStore((state) => state.updateItem);
  const removeItem = usePurchaseStore((state) => state.removeItem);
  const purchaseItemFields = useSettingsStore((state) => state.settings.purchaseItemFields || {});
  const purchaseCustomFields = useSettingsStore((state) => state.settings.purchaseCustomFields || []);
  
  const enabledFields = useMemo(() => {
    const fieldOrder = ['modelName', 'chassisNo', 'engineNo', 'colour', 'category', 'price', 'hsn', 'gst', 'location'];
    const fields = [];
    
    fieldOrder.forEach(key => {
      const field = purchaseItemFields[key];
      if (field && field.enabled) {
        fields.push({ key, ...field });
      }
    });
    
    purchaseCustomFields.forEach(field => {
      if (field.name) fields.push({ key: `custom_${field.id}`, label: field.name, mandatory: field.mandatory });
    });
    return fields;
  }, [purchaseItemFields, purchaseCustomFields]);
  
  const initialNewItem = useMemo(() => {
    const item = {};
    enabledFields.forEach(f => {
      item[f.key] = f.key === 'price' ? '0' : '';
    });
    return item;
  }, [enabledFields]);
  
  const [newItem, setNewItem] = useState(initialNewItem);
  const { toast } = useToast();

  const handleAddItem = useCallback(async () => {
    const errors = [];
    enabledFields.forEach(field => {
      if (field.mandatory && !validateRequired(newItem[field.key])) {
        errors.push(field.label);
      }
    });
    
    if (errors.length > 0) {
      toast({ title: "Validation Error", description: `Required: ${errors.join(', ')}`, variant: "destructive" });
      return;
    }
    
    if (newItem.chassisNo && !validateChassisNo(newItem.chassisNo)) {
      toast({ title: "Validation Error", description: "Invalid Chassis No format.", variant: "destructive" });
      return;
    }
    if (newItem.engineNo && !validateEngineNo(newItem.engineNo)) {
      toast({ title: "Validation Error", description: "Invalid Engine No format.", variant: "destructive" });
      return;
    }

    if (newItem.chassisNo && items.some(i => i.chassisNo === newItem.chassisNo.toUpperCase())) {
      toast({ title: "Duplicate Chassis No", description: "This chassis number is already in the current purchase list.", variant: "destructive" });
      return;
    }

    if (newItem.chassisNo && newItem.engineNo) {
      const { exists, message } = await checkStockExistence(newItem.chassisNo.toUpperCase(), newItem.engineNo.toUpperCase());
      if (exists) {
        toast({ title: "Stock Alert", description: message, variant: "destructive" });
        return;
      }
    }

    const itemToAdd = { ...newItem, id: Date.now().toString() };
    if (itemToAdd.chassisNo) itemToAdd.chassisNo = itemToAdd.chassisNo.toUpperCase();
    if (itemToAdd.engineNo) itemToAdd.engineNo = itemToAdd.engineNo.toUpperCase();
    
    addItem(itemToAdd);
    setNewItem(initialNewItem);
  }, [newItem, items, addItem, toast, enabledFields, initialNewItem]);

  const handleRemoveItem = useCallback((itemId) => {
    removeItem(itemId);
  }, [removeItem]);
  
  const handleItemInputChange = useCallback((e, id, field) => {
    let value = e.target.value;
    if (field === 'chassisNo' || field === 'engineNo') {
      value = value.toUpperCase();
    }
    updateItem(id, { [field]: value });
  }, [updateItem]);

  const handleNewItemInputChange = useCallback((e, field) => {
    let value = e.target.value;
    if (field === 'chassisNo' || field === 'engineNo') {
      value = value.toUpperCase();
    }
    setNewItem(p => ({ ...p, [field]: value }));
  }, []);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {enabledFields.map(field => (
              <TableHead key={field.key}>
                {field.label}{field.mandatory && <span className="text-red-500">*</span>}
              </TableHead>
            ))}
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              {enabledFields.map(field => (
                <TableCell key={field.key}>
                  <Input
                    type={field.key === 'price' ? 'number' : 'text'}
                    value={item[field.key] || ''}
                    onChange={(e) => handleItemInputChange(e, item.id, field.key)}
                    placeholder={field.label}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveItem(item.id)} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            {enabledFields.map(field => (
              <TableCell key={field.key}>
                <Input
                  type={field.key === 'price' ? 'number' : 'text'}
                  value={newItem[field.key] || ''}
                  onChange={(e) => handleNewItemInputChange(e, field.key)}
                  placeholder={field.label}
                  className={field.mandatory ? 'border-red-300' : ''}
                />
              </TableCell>
            ))}
            <TableCell>
              <Button type="button" size="icon" onClick={handleAddItem}>
                <Plus className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
});

export default PurchaseItemsTable;