#!/bin/bash

# Usage: ./restore-split-backup.sh 20251208_170508

if [ -z "$1" ]; then
    echo "Usage: $0 <timestamp>"
    echo "Example: $0 20251208_170508"
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="/root/supabase-backups"
DB_CONTAINER="supabase-db-pk8oksosowgkc8o0c8o4k0k4"

# Extract files
gunzip -k $BACKUP_DIR/roles_$TIMESTAMP.sql.gz
gunzip -k $BACKUP_DIR/schema_$TIMESTAMP.sql.gz
gunzip -k $BACKUP_DIR/data_$TIMESTAMP.sql.gz

# Restore in order
echo "Restoring roles..."
docker exec -i $DB_CONTAINER psql -U postgres < $BACKUP_DIR/roles_$TIMESTAMP.sql

echo "Restoring schema..."
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < $BACKUP_DIR/schema_$TIMESTAMP.sql

echo "Restoring data..."
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < $BACKUP_DIR/data_$TIMESTAMP.sql

# Cleanup extracted files
rm $BACKUP_DIR/roles_$TIMESTAMP.sql
rm $BACKUP_DIR/schema_$TIMESTAMP.sql
rm $BACKUP_DIR/data_$TIMESTAMP.sql

echo "Restore completed!"