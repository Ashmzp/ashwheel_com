#!/bin/bash

# Configuration
DB_CONTAINER="supabase-db-pk8oksosowgkc8o0c8o4k0k4"
DB_USER="postgres"
DB_NAME="postgres"
BACKUP_DIR="/root/supabase-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Export roles
docker exec $DB_CONTAINER pg_dumpall -U $DB_USER --roles-only > $BACKUP_DIR/roles_$DATE.sql

# Export schema only
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --schema-only > $BACKUP_DIR/schema_$DATE.sql

# Export data with disable-triggers
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --disable-triggers > $BACKUP_DIR/data_$DATE.sql

# Compress files
gzip $BACKUP_DIR/roles_$DATE.sql
gzip $BACKUP_DIR/schema_$DATE.sql
gzip $BACKUP_DIR/data_$DATE.sql

# Log
echo "$(date): Split backup completed - roles_$DATE.sql.gz, schema_$DATE.sql.gz, data_$DATE.sql.gz" >> /var/log/supabase-backup.log

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete