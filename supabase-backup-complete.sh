#!/bin/bash

# Complete Supabase Backup Script - Schema + Data + Roles + Storage
# Author: Ashwheel
# Usage: ./supabase-backup-complete.sh

set -e

# Configuration
BACKUP_DIR="/root/supabase-backups"
STORAGE_BACKUP_DIR="/root/supabase-storage-backups"
LOG_FILE="/var/log/supabase-backup.log"
RETENTION_DAYS=30

# Supabase Database Config
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="your-postgres-password"

# Supabase Storage Path (adjust based on your setup)
STORAGE_PATH="/var/lib/docker/volumes/supabase_storage/_data"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup filenames
FULL_BACKUP="backup_full_${TIMESTAMP}.dump"
SCHEMA_BACKUP="backup_schema_${TIMESTAMP}.sql"
ROLES_BACKUP="backup_roles_${TIMESTAMP}.sql"
STORAGE_BACKUP="backup_storage_${TIMESTAMP}.tar.gz"

# Create directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$STORAGE_BACKUP_DIR"

echo "========================================" | tee -a "$LOG_FILE"
echo "Backup started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 1. Full Database Backup (Schema + Data)
echo "📦 Creating full database backup..." | tee -a "$LOG_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/$FULL_BACKUP" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    FULL_SIZE=$(du -h "$BACKUP_DIR/$FULL_BACKUP" | cut -f1)
    echo "✅ Full backup completed: $FULL_SIZE" | tee -a "$LOG_FILE"
else
    echo "❌ Full backup failed" | tee -a "$LOG_FILE"
    exit 1
fi

# 2. Schema-only Backup (for quick restore structure)
echo "📋 Creating schema-only backup..." | tee -a "$LOG_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_DIR/$SCHEMA_BACKUP" 2>&1 | tee -a "$LOG_FILE"

gzip "$BACKUP_DIR/$SCHEMA_BACKUP"
SCHEMA_SIZE=$(du -h "$BACKUP_DIR/$SCHEMA_BACKUP.gz" | cut -f1)
echo "✅ Schema backup completed: $SCHEMA_SIZE" | tee -a "$LOG_FILE"

# 3. Roles and Privileges Backup
echo "👥 Creating roles backup..." | tee -a "$LOG_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dumpall \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --roles-only \
  --file="$BACKUP_DIR/$ROLES_BACKUP" 2>&1 | tee -a "$LOG_FILE"

gzip "$BACKUP_DIR/$ROLES_BACKUP"
ROLES_SIZE=$(du -h "$BACKUP_DIR/$ROLES_BACKUP.gz" | cut -f1)
echo "✅ Roles backup completed: $ROLES_SIZE" | tee -a "$LOG_FILE"

# 4. Storage Files Backup
if [ -d "$STORAGE_PATH" ]; then
    echo "📁 Creating storage backup..." | tee -a "$LOG_FILE"
    tar -czf "$STORAGE_BACKUP_DIR/$STORAGE_BACKUP" -C "$STORAGE_PATH" . 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        STORAGE_SIZE=$(du -h "$STORAGE_BACKUP_DIR/$STORAGE_BACKUP" | cut -f1)
        echo "✅ Storage backup completed: $STORAGE_SIZE" | tee -a "$LOG_FILE"
    else
        echo "⚠️ Storage backup failed or empty" | tee -a "$LOG_FILE"
    fi
else
    echo "⚠️ Storage path not found: $STORAGE_PATH" | tee -a "$LOG_FILE"
fi

# 5. Cleanup old backups
echo "🧹 Cleaning old backups (older than $RETENTION_DAYS days)..." | tee -a "$LOG_FILE"
find "$BACKUP_DIR" -name "backup_*" -type f -mtime +$RETENTION_DAYS -delete
find "$STORAGE_BACKUP_DIR" -name "backup_storage_*" -type f -mtime +$RETENTION_DAYS -delete
echo "✅ Cleanup completed" | tee -a "$LOG_FILE"

# 6. Summary
echo "========================================" | tee -a "$LOG_FILE"
echo "📊 Backup Summary:" | tee -a "$LOG_FILE"
echo "  Full DB: $FULL_SIZE" | tee -a "$LOG_FILE"
echo "  Schema: $SCHEMA_SIZE" | tee -a "$LOG_FILE"
echo "  Roles: $ROLES_SIZE" | tee -a "$LOG_FILE"
[ -n "$STORAGE_SIZE" ] && echo "  Storage: $STORAGE_SIZE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Backup completed: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
