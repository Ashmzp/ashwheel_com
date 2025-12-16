import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const InvoiceConfig = ({ settings, handleCompanyChange, handleCheckboxChange, handleNonRegFieldChange, handleRegFieldChange, handleCustomFieldChange, addCustomField, removeCustomField, handleSave, isSaving, handleWorkshopSettingsChange, handleExtraChargeChange, addExtraCharge, removeExtraCharge, handlePurchaseItemFieldChange, handlePurchaseCustomFieldChange, addPurchaseCustomField, removePurchaseCustomField }) => {
  if (!settings) {
    return <div>Loading settings...</div>;
  }

  const workshopSettings = settings.workshop_settings || {};
  const extraCharges = workshopSettings.extra_charges || [];
  const nonRegFields = settings.nonRegisteredCustomerFields || {};
  const regFields = settings.registeredCustomerFields || {};
  const customFields = settings.customFields || [];
  const purchaseItemFields = settings.purchaseItemFields || {};
  const purchaseCustomFields = settings.purchaseCustomFields || [];

  const renderFieldConfig = (title, fields, handler) => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(fields).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between p-2 border rounded-md">
            <span className="capitalize">{val.label || key.replace(/([A-Z])/g, ' $1')}</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <Checkbox checked={val.enabled} onCheckedChange={checked => handler(key, 'enabled', checked)} /> Enabled
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={val.mandatory} onCheckedChange={checked => handler(key, 'mandatory', checked)} disabled={!val.enabled} /> Mandatory
              </label>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Invoice Numbering</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Registered Prefix</Label>
            <Input name="registeredInvoicePrefix" value={settings.registeredInvoicePrefix || ''} onChange={handleCompanyChange} />
          </div>
          <div>
            <Label>Non-Registered Prefix</Label>
            <Input name="nonRegisteredInvoicePrefix" value={settings.nonRegisteredInvoicePrefix || ''} onChange={handleCompanyChange} />
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Note: Job card prefix is now in Workshop Config. Counters are managed automatically per financial year.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tax Calculation</CardTitle></CardHeader>
        <CardContent>
          <Label>Item Rate Calculation</Label>
          <RadioGroup
            value={workshopSettings.tax_calculation || 'inclusive'}
            onValueChange={(value) => handleWorkshopSettingsChange('tax_calculation', value)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="inclusive" id="inclusive" />
              <Label htmlFor="inclusive">Inclusive of GST</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="exclusive" id="exclusive" />
              <Label htmlFor="exclusive">Exclusive of GST</Label>
            </div>
          </RadioGroup>
          <p className="text-sm text-muted-foreground mt-2">Select if entered item rates are inclusive or exclusive of GST.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Extra Charges</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {extraCharges.map((charge, index) => (
            <div key={charge.id} className="flex items-center gap-2">
              <Input 
                value={charge.name} 
                onChange={(e) => handleExtraChargeChange(charge.id, e.target.value)} 
                placeholder="Enter charge name (e.g., Registration)" 
              />
              <Button variant="destructive" size="icon" onClick={() => removeExtraCharge(charge.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {extraCharges.length < 5 && (
            <Button onClick={addExtraCharge}>
              <Plus className="w-4 h-4 mr-2" /> Add Extra Charge
            </Button>
          )}
        </CardContent>
      </Card>

      {renderFieldConfig("Vehicle Purchase Item Fields", purchaseItemFields, handlePurchaseItemFieldChange)}

      <Card>
        <CardHeader><CardTitle>Custom Purchase Item Fields</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {purchaseCustomFields.map(field => (
            <div key={field.id} className="flex items-center gap-2">
              <Input value={field.name} onChange={e => handlePurchaseCustomFieldChange(field.id, e.target.value)} placeholder="Enter field name" />
              <label className="flex items-center gap-2">
                <Checkbox checked={field.mandatory} onCheckedChange={checked => handlePurchaseCustomFieldChange(field.id, field.name, checked)} /> Mandatory
              </label>
              <Button variant="destructive" size="icon" onClick={() => removePurchaseCustomField(field.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {purchaseCustomFields.length < 10 && <Button onClick={addPurchaseCustomField}><Plus className="w-4 h-4 mr-2" /> Add Custom Field</Button>}
        </CardContent>
      </Card>

      {renderFieldConfig("Non-Registered Customer Fields", nonRegFields, handleNonRegFieldChange)}
      {renderFieldConfig("Registered Customer Fields", regFields, handleRegFieldChange)}

      <Card>
        <CardHeader><CardTitle>Custom Customer Fields</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {customFields.map(field => (
            <div key={field.id} className="flex items-center gap-2">
              <Input value={field.name} onChange={e => handleCustomFieldChange(field.id, e.target.value)} placeholder="Enter field name" />
              <Button variant="destructive" size="icon" onClick={() => removeCustomField(field.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {customFields.length < 5 && <Button onClick={addCustomField}><Plus className="w-4 h-4 mr-2" /> Add Custom Field</Button>}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Invoice Config'}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceConfig;