import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { getJournalEntrySettings, updateJournalEntrySettings } from '@/utils/db/journalEntrySettings';

const JournalEntrySettingsPage = () => {
  const [priceFields, setPriceFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const settings = await getJournalEntrySettings(user.id);
      setPriceFields(settings.price_fields || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await updateJournalEntrySettings(user.id, { price_fields: priceFields });
      toast({ title: 'Success', description: 'Settings saved successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const newField = {
      id: `custom_${Date.now()}`,
      label: 'New Price Field',
      enabled: true,
      order: priceFields.length + 1
    };
    setPriceFields([...priceFields, newField]);
  };

  const removeField = (id) => {
    setPriceFields(priceFields.filter(f => f.id !== id));
  };

  const updateField = (id, updates) => {
    setPriceFields(priceFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {priceFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Field Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field name"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(checked) => updateField(field.id, { enabled: checked })}
                      />
                      <Label className="text-xs">Enabled</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(field.id)}
                      disabled={priceFields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={addField} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Add Custom Field
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntrySettingsPage;
