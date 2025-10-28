#!/bin/bash

# ============================================
# Скрипт для применения Row-Level Security
# ============================================

set -e

echo "🔐 Applying Row-Level Security (RLS) to PostgreSQL..."
echo ""

# Проверяем переменные окружения
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Please set it in .env file or export it:"
  echo "export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/servicedesk'"
  exit 1
fi

# Извлекаем параметры подключения из DATABASE_URL
# Формат: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DB_URL_REGEX='postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+)'

if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASSWORD="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "❌ ERROR: Invalid DATABASE_URL format"
  exit 1
fi

echo "📊 Database connection:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Применяем миграцию
echo "📝 Applying RLS migration..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f prisma/migrations/enable_rls.sql

echo ""
echo "✅ RLS successfully applied!"
echo ""
echo "🔍 Verifying RLS policies..."

# Проверяем, что RLS включен
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tenants', 'users', 'tickets', 'categories')
ORDER BY tablename;
"

echo ""
echo "✅ RLS is now active!"
echo ""
echo "⚠️  IMPORTANT: Make sure to restart your Next.js dev server for changes to take effect:"
echo "   bun run dev"
echo ""

