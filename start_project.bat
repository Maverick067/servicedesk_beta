@echo off
echo ====================================
echo   ServiceDesk - Запуск проекта
echo ====================================
echo.

echo Проверка установки зависимостей...
if not exist "node_modules\" (
    echo Установка зависимостей...
    call bun install
) else (
    echo Зависимости уже установлены.
)

echo.
echo Генерация Prisma клиента...
call bun run db:generate

echo.
echo Запуск dev сервера...
echo Приложение будет доступно на http://localhost:3000
echo.
call bun run dev

