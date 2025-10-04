@echo off
echo 🐳 Развертывание Secret Manager в Docker...

echo 📦 Сборка и запуск всех сервисов...
docker compose up --build -d

echo ⏳ Ожидание запуска сервисов...
timeout /t 10 /nobreak >nul

echo 🔍 Проверка статуса сервисов...
docker compose ps

echo 🌐 Проверка доступности сервисов...

echo 📊 Проверка backend API...
curl -s http://localhost:8000/health >nul
if %errorlevel% equ 0 (
    echo ✅ Backend API работает
) else (
    echo ❌ Backend API недоступен
)

echo 🔑 Проверка Keycloak...
curl -s http://localhost:8080 >nul
if %errorlevel% equ 0 (
    echo ✅ Keycloak работает
) else (
    echo ❌ Keycloak недоступен
)

echo 🔐 Проверка OpenBao...
curl -s http://localhost:8200/v1/sys/health >nul
if %errorlevel% equ 0 (
    echo ✅ OpenBao работает
) else (
    echo ❌ OpenBao недоступен
)

echo.
echo 🎉 Развертывание завершено!
echo.
echo 📱 Доступные сервисы:
echo    🌐 Client Portal: http://localhost:3000
echo    🛡️  Admin Portal: http://localhost:3001
echo    🔧 Backend API: http://localhost:8000
echo    🔑 Keycloak: http://localhost:8080 (admin/admin)
echo    🔐 OpenBao: http://localhost:8200
echo.
echo 📋 Полезные команды:
echo    docker compose logs -f [service] - просмотр логов
echo    docker compose restart [service] - перезапуск сервиса
echo    docker compose down - остановка всех сервисов
echo    docker compose down -v - остановка с удалением данных
echo.
pause
