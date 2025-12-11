#!/bin/bash

# Simple Supabase Restore
# Usage: ./supabase-restore-simple.sh backup_20251208_103014.sql.gz

BACKUP_DIR="/root/supabase-backups"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "❌ Backup not found: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

read -p "⚠️  This will OVERWRITE database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Restoring from: $BACKUP_FILE"
gunzip -c "$BACKUP_DIR/$BACKUP_FILE" | docker exec -i supabase-db-pk8oksosowgkc8o0c8o4k0k4 psql -U postgres

if [ $? -eq 0 ]; then
    echo "✅ Restore completed"
else
    echo "❌ Restore failed"
    exit 1
fi
