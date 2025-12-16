import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const DEFAULT_FIELDS = [
  { key: 'modelName', label: 'Model Name', enabled: true, mandatory: true },
  { key: 'chassisNo', label: 'Chassis No', enabled: true, mandatory: true },
  { key: 'engineNo', label: 'Engine No', enabled: true, mandatory: true },
  { key: 'colour', label: 'Colour', enabled: true, mandatory: true },
  { key: 'category', label: 'Category', enabled: true, mandatory: true },
  { key: 'price', label: 'Price', enabled: true, mandatory: true },
  { key: 'hsn', label: 'HSN', enabled: true, mandatory: true },
  { key: 'gst', label: 'GST%', enabled: true, mandatory: true },
];

const PurchaseItemsConfig = ({ 
  purchaseItemFields = DEFAULT_FIELDS,
  onFieldChange,
  onAddField,
  onRemoveField,
  onReorder
}) => {
  
  const handleLabelChange = (key, newLabel) => {
    onFieldChange(key, 'label', newLabel);
  };

  const handleToggle = (key, prop, value) => {
    onFieldChange(key, prop, value);
  };

  const isDefaultField = (key) => {
    return DEFAULT_FIELDS.some(f => f.key === key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Items Fields Configuration</CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize field names, add new fields, and set mandatory requirements. Excel import will auto-map based on these labels.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {purchaseItemFields.map((field, index) => (
          <div 
            key={field.key} 
            className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Field Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => handleLabelChange(field.key, e.target.value)}
                  placeholder="Enter field label"
                  className="h-9"
                />
              </div>
              
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={field.enabled}
                    onCheckedChange={(checked) => handleToggle(field.key, 'enabled', checked)}
                  />
                  <span className="text-sm">Enabled</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={field.mandatory}
                    onCheckedChange={(checked) => handleToggle(field.key, 'mandatory', checked)}
                    disabled={!field.enabled}
                  />
                  <span className="text-sm">Mandatory</span>
                </label>
              </div>
            </div>

            {!isDefaultField(field.key) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveField(field.key)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        <Button onClick={onAddField} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Add Custom Field
        </Button>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Excel Import Mapping:</strong> When importing Excel files, column headers will be matched with these field labels automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseItemsConfig;
