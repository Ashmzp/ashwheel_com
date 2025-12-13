import { supabase } from '@/lib/customSupabaseClient';

export const getJournalEntrySettings = async (userId) => {
  const defaultSettings = {
    user_id: userId,
    price_fields: [
      { id: 'vehicle_price', label: 'Vehicle Price', enabled: true, order: 1 },
      { id: 'rto_price', label: 'RTO Price', enabled: true, order: 2 },
      { id: 'insurance_price', label: 'Insurance Price', enabled: true, order: 3 },
      { id: 'accessories_price', label: 'Accessories Price', enabled: true, order: 4 },
      { id: 'warranty_price', label: 'Extended Warranty Price', enabled: true, order: 5 }
    ]
  };

  try {
    const { data, error } = await supabase
      .from('journal_entry_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return defaultSettings;
    }

    return data || defaultSettings;
  } catch (err) {
    console.error('Exception in getJournalEntrySettings:', err);
    return defaultSettings;
  }
};

export const updateJournalEntrySettings = async (userId, settings) => {
  try {
    const { data, error } = await supabase
      .from('journal_entry_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      throw new Error('Failed to save settings. Please check database permissions.');
    }
    return data;
  } catch (err) {
    console.error('Exception in updateJournalEntrySettings:', err);
    throw err;
  }
};
