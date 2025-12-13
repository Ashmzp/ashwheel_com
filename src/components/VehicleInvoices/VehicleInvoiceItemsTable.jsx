import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VehicleInvoiceItemsTable = ({ items, setItems, onRemoveItem, taxCalculation }) => {
  
  const updateItem = (chassis_no, updates) => {
    const currentItems = Array.isArray(items) ? items : [];
    const newItems = currentItems.map(item => {
      if (item.chassis_no === chassis_no) {
        let updatedItem = { ...item, ...updates };
        const price = parseFloat(updatedItem.price) || 0;
        const gstRate = parseFloat(updatedItem.gst) || 0;
        const discountAmount = parseFloat(updatedItem.discount) || 0;

        let taxableValue = 0;
        let totalGst = 0;
        let priceAfterDiscount = price - discountAmount;
        
        updatedItem.price = price;
        updatedItem.discount = discountAmount;

        if (priceAfterDiscount > 0 && gstRate > 0) {
          if (taxCalculation === 'inclusive') {
            taxableValue = priceAfterDiscount / (1 + gstRate / 100);
            totalGst = priceAfterDiscount - taxableValue;
          } else { // exclusive
            taxableValue = priceAfterDiscount;
            totalGst = taxableValue * (gstRate / 100);
          }
          
          updatedItem.taxable_value = parseFloat(taxableValue.toFixed(2));
          updatedItem.cgst_rate = gstRate / 2;
          updatedItem.sgst_rate = gstRate / 2;
          updatedItem.cgst_amount = parseFloat((totalGst / 2).toFixed(2));
          updatedItem.sgst_amount = parseFloat((totalGst / 2).toFixed(2));
          updatedItem.igst_rate = 0;
          updatedItem.igst_amount = 0;
        } else {
          updatedItem.taxable_value = priceAfterDiscount;
          updatedItem.cgst_rate = 0;
          updatedItem.sgst_rate = 0;
          updatedItem.cgst_amount = 0;
          updatedItem.sgst_amount = 0;
          updatedItem.igst_rate = 0;
          updatedItem.igst_amount = 0;
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  const handleFieldChange = (chassis_no, field, value) => {
    updateItem(chassis_no, { [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model Name</TableHead>
              <TableHead>Chassis No</TableHead>
              <TableHead>Engine No</TableHead>
              <TableHead>Colour</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Discount Amt</TableHead>
              <TableHead>GST %</TableHead>
              <TableHead>Taxable Value</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {items.length > 0 ? items.map(item => (
                <motion.tr 
                  key={item.chassis_no}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TableCell>{item.model_name}</TableCell>
                  <TableCell>{item.chassis_no}</TableCell>
                  <TableCell>{item.engine_no}</TableCell>
                  <TableCell>{item.colour}</TableCell>
                  <TableCell>
                      <Input 
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => handleFieldChange(item.chassis_no, 'price', e.target.value)}
                        className="w-32"
                      />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      value={item.discount || ''}
                      onChange={(e) => handleFieldChange(item.chassis_no, 'discount', e.target.value)}
                      className="w-24"
                      placeholder="e.g. 500"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      value={item.gst || ''}
                      onChange={(e) => handleFieldChange(item.chassis_no, 'gst', e.target.value)}
                      className="w-24"
                      placeholder="e.g. 28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      value={item.taxable_value || ''}
                      disabled
                      className="w-32 bg-muted"
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" size="icon" variant="ghost" onClick={() => onRemoveItem(item)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              )) : (
                <TableRow><TableCell colSpan={9} className="text-center h-24">No items added. Use 'Add Item from Stock' button to add vehicles.</TableCell></TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VehicleInvoiceItemsTable;