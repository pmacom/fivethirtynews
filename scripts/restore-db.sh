#!/bin/bash
# Database restore script for local Supabase
# Usage: ./scripts/restore-db.sh [backup_file.sql.gz]

BACKUP_DIR="./backups"

if [ -z "$1" ]; then
  echo "Available backups:"
  ls -lht "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null | head -10
  echo ""
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Example: $0 backups/backup_20251130_123456.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace ALL data in the local database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring database..."

# Decompress and restore using Docker
gunzip -c "$BACKUP_FILE" | docker exec -i supabase_db_fivethirty-local psql -U postgres -d postgres

if [ $? -eq 0 ]; then
  echo "Database restored successfully!"
else
  echo "ERROR: Restore failed!"
  exit 1
fi
