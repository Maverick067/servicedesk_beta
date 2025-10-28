@echo off
echo ===============================================
echo  ПЕРЕЗАПУСК DEV СЕРВЕРА С ОБНОВЛЕНИЕМ PRISMA
echo ===============================================
echo.

echo [1/4] Остановка текущего процесса...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Удаление старого Prisma Client...
rmdir /S /Q node_modules\.prisma 2>nul

echo [3/4] Генерация нового Prisma Client...
call bunx prisma generate

echo [4/4] Запуск dev сервера...
echo.
echo ===============================================
echo  СЕРВЕР ЗАПУСКАЕТСЯ...
echo ===============================================
call bun run dev

