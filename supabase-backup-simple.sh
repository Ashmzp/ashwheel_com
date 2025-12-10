#!/bin/bash

# Simple Supabase Backup - Based on existing setup
# Matches your current working backup

BACKUP_DIR="/root/supabase-backups"
LOG_FILE="/var/log/supabase-backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "========================================" | tee -a "$LOG_FILE"
echo "Backup started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Full backup with schema
docker exec supabase-db-pk8oksosowgkc8o0c8o4k0k4 pg_dumpall -U postgres | gzip > "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz" | cut -f1)
    echo "Backup completed: $SIZE" | tee -a "$LOG_FILE"
else
    echo "Backup failed" | tee -a "$LOG_FILE"
    exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "Cleanup completed" | tee -a "$LOG_FILE"
