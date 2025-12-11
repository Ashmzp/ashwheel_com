#!/bin/bash

# Complete Supabase Restore Script
# Author: Ashwheel
# Usage: ./supabase-restore.sh backup_full_20251208_103014.dump

set -e

# Configuration
BACKUP_DIR="/root/supabase-backups"
STORAGE_BACKUP_DIR="/root/supabase-storage-backups"
LOG_FILE="/var/log/supabase-restore.log"

# Supabase Database Config
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="your-postgres-password"

# Supabase Storage Path
STORAGE_PATH="/var/lib/docker/volumes/supabase_storage/_data"

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.dump>"
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_full_*.dump 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

echo "========================================" | tee -a "$LOG_FILE"
echo "Restore started: $(date)" | tee -a "$LOG_FILE"
echo "Backup file: $BACKUP_FILE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Warning
read -p "⚠️  This will OVERWRITE current database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# 1. Restore Roles (if exists)
ROLES_FILE=$(echo "$BACKUP_FILE" | sed 's/backup_full_/backup_roles_/' | sed 's/.dump/.sql.gz/')
if [ -f "$BACKUP_DIR/$ROLES_FILE" ]; then
    echo "👥 Restoring roles..." | tee -a "$LOG_FILE"
    gunzip -c "$BACKUP_DIR/$ROLES_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
      --host="$DB_HOST" \
      --port="$DB_PORT" \
      --username="$DB_USER" \
      --dbname="postgres" 2>&1 | tee -a "$LOG_FILE"
    echo "✅ Roles restored" | tee -a "$LOG_FILE"
fi

# 2. Restore Full Database
echo "📦 Restoring database..." | tee -a "$LOG_FILE"
PGPASSWORD="$DB_PASSWORD" pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  "$BACKUP_DIR/$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully" | tee -a "$LOG_FILE"
else
    echo "⚠️ Database restore completed with warnings (check log)" | tee -a "$LOG_FILE"
fi

# 3. Restore Storage (if exists)
STORAGE_FILE=$(echo "$BACKUP_FILE" | sed 's/backup_full_/backup_storage_/' | sed 's/.dump/.tar.gz/')
if [ -f "$STORAGE_BACKUP_DIR/$STORAGE_FILE" ]; then
    echo "📁 Restoring storage files..." | tee -a "$LOG_FILE"
    rm -rf "$STORAGE_PATH"/*
    tar -xzf "$STORAGE_BACKUP_DIR/$STORAGE_FILE" -C "$STORAGE_PATH" 2>&1 | tee -a "$LOG_FILE"
    echo "✅ Storage restored" | tee -a "$LOG_FILE"
else
    echo "⚠️ Storage backup not found: $STORAGE_FILE" | tee -a "$LOG_FILE"
fi

echo "========================================" | tee -a "$LOG_FILE"
echo "✅ Restore completed: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
