#!/bin/bash

# LDAP Sync Cron Script
# Автоматическая синхронизация пользователей из Active Directory
# 
# Установка в crontab:
# 0 * * * * /path/to/scripts/ldap-sync-cron.sh >> /var/log/ldap-sync.log 2>&1

# Конфигурация
API_URL="${API_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-change-me-in-production}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting LDAP sync..."

# Вызываем API endpoint
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${API_URL}/api/cron/ldap-sync")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Sync successful"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Sync failed (HTTP $http_code)"
  echo "$body"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Finished"
echo "---"

