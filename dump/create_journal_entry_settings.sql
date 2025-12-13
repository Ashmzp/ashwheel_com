-- Enable RLS on journal_entry_settings
ALTER TABLE journal_entry_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own settings" ON journal_entry_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON journal_entry_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON journal_entry_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON journal_entry_settings;

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

CREATE POLICY "Users can delete their own settings"
  ON journal_entry_settings
  FOR DELETE
  USING (auth.uid() = user_id);
