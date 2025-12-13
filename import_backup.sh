#!/bin/bash

echo "========================================"
echo "Supabase Database Import Script"
echo "========================================"
echo

# Set your Supabase connection details
SUPABASE_HOST="your-supabase-host.supabase.co"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
SUPABASE_PASSWORD="your-password"
SUPABASE_PORT="5432"

# Backup directory
BACKUP_DIR="/c/Users/ASHISH/Desktop/ashwheel_com/backup_download"

echo "Checking if backup files exist..."
if [ ! -f "$BACKUP_DIR/roles_20251210_175233.sql" ]; then
    echo "ERROR: roles_20251210_175233.sql not found!"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/schema_20251210_175233.sql" ]; then
    echo "ERROR: schema_20251210_175233.sql not found!"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/data_20251210_175233.sql" ]; then
    echo "ERROR: data_20251210_175233.sql not found!"
    exit 1
fi

echo "All backup files found!"
echo

echo "========================================"
echo "IMPORTANT: Update connection details"
echo "========================================"
echo "Please update the following variables in this script:"
echo "- SUPABASE_HOST: $SUPABASE_HOST"
echo "- SUPABASE_PASSWORD: $SUPABASE_PASSWORD"
echo
read -p "Press Enter to continue or Ctrl+C to exit and update..."

echo
echo "========================================"
echo "Starting Import Process"
echo "========================================"

echo "Step 1: Importing Roles..."
PGPASSWORD=$SUPABASE_PASSWORD psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -f "$BACKUP_DIR/roles_20251210_175233.sql"
if [ $? -ne 0 ]; then
    echo "WARNING: Role import had issues. This is normal for hosted Supabase."
    echo "Continuing with schema import..."
fi

echo
echo "Step 2: Importing Schema..."
PGPASSWORD=$SUPABASE_PASSWORD psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -f "$BACKUP_DIR/schema_20251210_175233.sql"
if [ $? -ne 0 ]; then
    echo "ERROR: Schema import failed!"
    exit 1
fi

echo
echo "Step 3: Importing Data..."
PGPASSWORD=$SUPABASE_PASSWORD psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -f "$BACKUP_DIR/data_20251210_175233.sql"
if [ $? -ne 0 ]; then
    echo "ERROR: Data import failed!"
    exit 1
fi

echo
echo "========================================"
echo "Import Completed Successfully!"
echo "========================================"
echo
echo "Your Ashwheel database has been restored to Supabase."
echo "You can now update your application's environment variables:"
echo "- VITE_SUPABASE_URL=https://$SUPABASE_HOST"
echo "- VITE_SUPABASE_ANON_KEY=your-anon-key"
echo