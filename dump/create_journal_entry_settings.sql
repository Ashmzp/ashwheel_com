-- Create journal_entry_settings table if not exists
CREATE TABLE IF NOT EXISTS journal_entry_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  price_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE journal_entry_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own settings" ON journal_entry_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON journal_entry_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON journal_entry_settings;

-- Create RLS policies
CREATE POLICY "Users can view their own settings"
  ON journal_entry_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON journal_entry_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON journal_entry_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
