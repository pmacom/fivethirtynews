#!/bin/bash
# Database backup script for local Supabase
# Run this before any destructive operations!

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."
echo "Backup file: $BACKUP_FILE"

# Use Docker to run pg_dump with matching Postgres version
docker exec supabase_db_fivethirty-local pg_dump \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-acl \
  > "$BACKUP_FILE"

if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
  # Compress the backup
  gzip "$BACKUP_FILE"
  echo "Backup created successfully: ${BACKUP_FILE}.gz"

  # Show backup size
  ls -lh "${BACKUP_FILE}.gz"

  # Keep only last 10 backups
  cd "$BACKUP_DIR"
  ls -t backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --

  echo ""
  echo "Recent backups:"
  ls -lht backup_*.sql.gz 2>/dev/null | head -5
else
  echo "ERROR: Backup failed!"
  rm -f "$BACKUP_FILE"
  exit 1
fi
