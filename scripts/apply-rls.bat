@echo off
REM ============================================
REM Скрипт для применения Row-Level Security
REM ============================================

echo 🔐 Applying Row-Level Security (RLS) to PostgreSQL...
echo.

REM Проверяем переменную окружения
if "%DATABASE_URL%"=="" (
    echo ❌ ERROR: DATABASE_URL environment variable is not set
    echo Please set it in .env file or run:
    echo set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/servicedesk
    exit /b 1
)

echo 📝 Applying RLS migration...
psql %DATABASE_URL% -f prisma\migrations\enable_rls.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: Failed to apply RLS migration
    echo.
    echo Make sure PostgreSQL psql is installed and in PATH
    echo You can install it from: https://www.postgresql.org/download/windows/
    echo.
    echo Or use WSL to run apply-rls.sh instead
    exit /b 1
)

echo.
echo ✅ RLS successfully applied!
echo.
echo 🔍 Verifying RLS policies...

psql %DATABASE_URL% -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('tenants', 'users', 'tickets', 'categories') ORDER BY tablename;"

echo.
echo ✅ RLS is now active!
echo.
echo ⚠️  IMPORTANT: Make sure to restart your Next.js dev server for changes to take effect:
echo    bun run dev
echo.

pause

