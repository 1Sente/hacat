@echo off
echo 🚀 Запуск Secret Manager в режиме разработки...
echo.

echo 📦 Запуск внешних сервисов...
docker compose up -d postgres keycloak openbao

echo.
echo ⏳ Ожидание готовности сервисов...
timeout /t 10 /nobreak > nul

echo.
echo 🔧 Запуск Backend в режиме разработки...
cd backend
if not exist node_modules (
    echo 📥 Установка зависимостей...
    npm install
)

echo 🗄️ Настройка базы данных...
npx prisma generate
npx prisma db push

echo.
echo 🌐 Запуск Backend сервера...
start "Backend Dev Server" cmd /k "npm run dev"

echo.
echo 🎯 Backend запущен на http://localhost:8000
echo 📊 Keycloak: http://localhost:8080 (admin/admin)
echo 🔐 OpenBao: http://localhost:8200
echo.

echo 💡 Для запуска Frontend:
echo    cd frontend-client && npm install && npm run dev
echo    cd frontend-admin && npm install && npm run dev
echo.

pause
