#!/usr/bin/env bash
# ==============================================================================
# Garment OS — Production Database Backup & Resilience Script
# ==============================================================================
# Description: Automated, production-ready MariaDB dump & compression script.
# Features:
#   1. Reads configuration from environment variables or secure defaults.
#   2. Uses mysqldump with single-transaction & quick flags for zero downtime.
#   3. Gzip compresses backup file with ISO timestamp naming convention.
#   4. Restricts file permissions (chmod 600) to isolate data at rest.
#   5. Automatically purges backups older than 30 days.
#
# CRONTAB AUTOMATION SETUP INSTRUCTIONS:
# To run this script automatically every midnight (00:00 AM):
#   1. Make script executable:
#        chmod +x /var/www/garment_os/scripts/backup_db.sh
#   2. Open crontab editor:
#        crontab -e
#   3. Add the following line (update path as appropriate for your server):
#        0 0 * * * /var/www/garment_os/scripts/backup_db.sh >> /var/log/garment_os_backup.log 2>&1
# ==============================================================================

set -euo pipefail

# ── Configuration Defaults & Environment Override ─────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-u465023737_garment_os}"
DB_USER="${DB_USER:-u465023737_garment_admin}"
DB_PASS="${DB_PASS:-Sai@51155}"
PORT="${DB_PORT:-3306}"

# Directory where backups are stored
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/garment_os}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
TMP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.tmp"

# ── Ensure Backup Directory Exists ────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(date -Iseconds)] [INFO] Starting MariaDB backup for database: ${DB_NAME}..."

# ── Execute mysqldump & Compress ──────────────────────────────────────────────
if command -v mysqldump &> /dev/null; then
    MYSQLDUMP_BIN="mysqldump"
elif command -v mariadb-dump &> /dev/null; then
    MYSQLDUMP_BIN="mariadb-dump"
else
    echo "[$(date -Iseconds)] [ERROR] Neither mysqldump nor mariadb-dump CLI utility was found." >&2
    exit 1
fi

"$MYSQLDUMP_BIN" \
    --host="$DB_HOST" \
    --port="$PORT" \
    --user="$DB_USER" \
    --password="$DB_PASS" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --default-character-set=utf8mb4 \
    "$DB_NAME" | gzip -c > "$TMP_FILE"

mv "$TMP_FILE" "$BACKUP_FILE"

# ── Data Isolation & File Permissions ──────────────────────────────────────────
chmod 600 "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] [SUCCESS] Backup successfully created: ${BACKUP_FILE} (${FILE_SIZE})"

# ── Retention Policy (Purge backups older than RETENTION_DAYS) ─────────────────
echo "[$(date -Iseconds)] [INFO] Enforcing retention policy: purging backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "[$(date -Iseconds)] [INFO] Retention cleanup complete. ${DELETED_COUNT} old backup archive(s) purged."

echo "[$(date -Iseconds)] [COMPLETE] Database resilience run finished successfully."
