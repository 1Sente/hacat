# 🚀 Быстрый старт Secret Manager

## 📋 Предварительные требования

- Docker и Docker Compose
- Git

## ⚡ Запуск за 3 шага

### 1. Клонируйте и перейдите в папку проекта
```bash
git clone <repository-url>
cd secretmanager
```

### 2. Запустите все сервисы
```bash
docker compose up --build
```

### 3. Откройте приложения
- **Client Portal**: http://localhost:3000
- **Admin Portal**: http://localhost:3001
- **Keycloak**: http://localhost:8080 (admin/admin)
- **OpenBao**: http://localhost:8200
- **API**: http://localhost:8000

## 🎯 Первые шаги

### Настройка Keycloak

1. Откройте http://localhost:8080
2. Войдите как admin/admin
3. Создайте realm "secretmanager" (опционально)
4. Создайте пользователей с ролями:
   - `user` - обычные пользователи
   - `approver` - одобряющие
   - `admin` - администраторы

### Тестирование системы

1. **Создание запроса**:
   - Откройте Client Portal
   - Войдите как пользователь
   - Создайте запрос на доступ к секрету

2. **Одобрение запроса**:
   - Откройте Admin Portal
   - Войдите как администратор/одобряющий
   - Перейдите в "Одобрения"
   - Одобрите запрос и введите данные секрета

3. **Получение секрета**:
   - Вернитесь в Client Portal
   - Перейдите в "Мои запросы"
   - Просмотрите одобренный секрет

## 🔧 Полезные команды

```bash
# Просмотр логов
docker compose logs -f backend

# Перезапуск сервиса
docker compose restart backend

# Очистка данных
docker compose down -v

# Сборка без кеша
docker compose build --no-cache
```

## 🆘 Решение проблем

### Сервисы не запускаются
- Проверьте, что порты 3000, 3001, 8000, 8080, 8200 свободны
- Убедитесь, что Docker запущен

### Ошибки аутентификации
- Проверьте настройки Keycloak
- Убедитесь, что realm и клиенты настроены правильно

### Ошибки базы данных
- Проверьте подключение к PostgreSQL
- Выполните миграции: `docker compose exec backend npx prisma migrate dev`

## 📚 Дополнительная информация

- Полная документация: [README.md](README.md)
- API документация: http://localhost:8000
- Архитектура системы описана в README.md

---

**Готово! 🎉 Система Secret Manager запущена и готова к использованию.**
