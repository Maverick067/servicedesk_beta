@echo off
REM LDAP Sync Cron Script для Windows
REM Автоматическая синхронизация пользователей из Active Directory
REM 
REM Установка в Task Scheduler:
REM 1. Откройте Task Scheduler
REM 2. Создайте новую задачу
REM 3. Триггер: Каждый час (или по вашему расписанию)
REM 4. Действие: Запустить этот .bat файл
REM 5. Настройте переменные окружения или отредактируйте этот файл

setlocal

REM Конфигурация
set API_URL=http://localhost:3000
set CRON_SECRET=change-me-in-production

echo [%date% %time%] Starting LDAP sync...

REM Вызываем API endpoint
curl -s -H "Authorization: Bearer %CRON_SECRET%" "%API_URL%/api/cron/ldap-sync"

if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Sync successful
) else (
    echo [%date% %time%] Sync failed
)

echo [%date% %time%] Finished
echo ---

endlocal

