import { supabase } from '@/lib/customSupabaseClient';

export const getJournalEntrySettings = async (userId) => {
  const { data, error } = await supabase
    .from('journal_entry_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
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

    const { data: newData, error: insertError } = await supabase
      .from('journal_entry_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (insertError) throw insertError;
    return newData;
  }

  return data;
};

export const updateJournalEntrySettings = async (userId, settings) => {
  const { data, error } = await supabase
    .from('journal_entry_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
