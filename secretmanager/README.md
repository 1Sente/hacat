# 🔐 Secret Manager

Полнофункциональная система управления секретами с веб-интерфейсом, построенная на современном технологическом стеке.

## 🏗️ Архитектура

```mermaid
graph TB
    subgraph "Frontend Applications"
        A[Client Portal<br/>React + Vite<br/>:3000]
        B[Admin Portal<br/>React + Vite<br/>:3001]
    end
    
    subgraph "Backend Services"
        C[API Server<br/>Node.js + Express<br/>:8000]
        D[WebSocket Server<br/>Socket.io]
    end
    
    subgraph "External Services"
        E[Keycloak<br/>Identity Management<br/>:8080]
        F[OpenBao<br/>Secret Storage<br/>:8200]
        G[PostgreSQL<br/>Database<br/>:5432]
    end
    
    A --> C
    B --> C
    A --> D
    B --> D
    C --> E
    C --> F
    C --> G
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#f3e5f5
    style E fill:#e8f5e8
    style F fill:#fff8e1
    style G fill:#fce4ec
```

## 🚀 Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Git

### Установка и запуск

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd secretmanager
   ```

2. **Запустите все сервисы:**
   ```bash
   docker compose up --build
   ```

3. **Откройте приложения:**
   - **Client Portal**: http://localhost:3000
   - **Admin Portal**: http://localhost:3001
   - **Keycloak**: http://localhost:8080 (admin/admin)
   - **OpenBao**: http://localhost:8200
   - **API**: http://localhost:8000

## 📋 Функциональность

### 🔑 Аутентификация и авторизация
- **Keycloak** для единого входа (SSO)
- Роли: `user`, `approver`, `admin`
- JWT токены для API аутентификации
- Автоматическое обновление токенов

### 📝 Управление запросами
- Создание запросов на доступ к секретам
- Система одобрения/отклонения запросов
- Отслеживание статуса запросов в реальном времени
- WebSocket уведомления

### 🔐 Хранение секретов
- **OpenBao** для безопасного хранения секретов
- Шифрование данных
- Аудит доступа к секретам
- Ротация секретов

### 📊 Аналитика и аудит
- Статистика использования
- Журнал аудита всех действий
- Аналитика по пользователям и запросам
- Экспорт данных

## 🛠️ Технологический стек

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - веб-фреймворк
- **Prisma** - ORM для работы с базой данных
- **Socket.io** - WebSocket соединения
- **PostgreSQL** - основная база данных

### Frontend
- **React 18** + **TypeScript**
- **Vite** - сборщик
- **TailwindCSS** - стилизация
- **Zustand** - управление состоянием
- **React Router** - маршрутизация

### Инфраструктура
- **Docker** + **Docker Compose**
- **Nginx** - веб-сервер для frontend
- **Keycloak** - управление идентификацией
- **OpenBao** - хранение секретов

## 📁 Структура проекта

```
secretmanager/
├── docker-compose.yml          # Оркестрация сервисов
├── backend/                    # Backend API
│   ├── src/
│   │   ├── api/               # API маршруты
│   │   ├── services/          # Бизнес-логика
│   │   ├── middleware/        # Middleware
│   │   └── index.ts           # Точка входа
│   ├── prisma/
│   │   └── schema.prisma      # Схема базы данных
│   └── Dockerfile
├── frontend-client/           # Клиентский портал
│   ├── src/
│   │   ├── components/        # React компоненты
│   │   ├── pages/            # Страницы
│   │   ├── store/            # Zustand stores
│   │   └── services/         # API клиенты
│   └── Dockerfile
├── frontend-admin/            # Админский портал
│   ├── src/
│   │   ├── components/        # React компоненты
│   │   ├── pages/            # Страницы
│   │   ├── store/            # Zustand stores
│   │   └── services/         # API клиенты
│   └── Dockerfile
└── README.md
```

## 🔧 Конфигурация

### Переменные окружения

#### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/secretmanager"
OPENBAO_URL="http://openbao:8200"
OPENBAO_TOKEN="root-token"
KEYCLOAK_URL="http://keycloak:8080"
KEYCLOAK_REALM="master"
KEYCLOAK_CLIENT_ID="secretmanager-client"
PORT=8000
```

#### Frontend Client (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=master
VITE_KEYCLOAK_CLIENT_ID=secretmanager-client
```

#### Frontend Admin (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=master
VITE_KEYCLOAK_CLIENT_ID=secretmanager-admin
```

## 🎯 Пользовательские сценарии

### 1. Создание запроса на доступ
1. Пользователь входит в Client Portal
2. Создает новый запрос с указанием ресурса и обоснования
3. Запрос отправляется на рассмотрение

### 2. Одобрение запроса
1. Администратор/одобряющий входит в Admin Portal
2. Просматривает список ожидающих запросов
3. Одобряет запрос и вводит данные секрета
4. Секрет сохраняется в OpenBao
5. Пользователь получает уведомление

### 3. Получение секрета
1. Пользователь просматривает свои одобренные запросы
2. Нажимает "Просмотреть секрет"
3. Данные секрета отображаются с возможностью скрытия/показа значений
4. Можно скопировать данные или скачать JSON файл

## 🔒 Безопасность

- **Аутентификация**: Keycloak SSO
- **Авторизация**: Ролевая модель доступа
- **Шифрование**: OpenBao для хранения секретов
- **Аудит**: Полное логирование всех действий
- **HTTPS**: Рекомендуется для продакшена
- **Токены**: JWT с автоматическим обновлением

## 📊 API Документация

### Основные эндпоинты

#### Аутентификация
- `GET /api/auth/me` - Информация о текущем пользователе
- `POST /api/auth/verify` - Проверка токена

#### Запросы
- `GET /api/requests` - Список запросов
- `POST /api/requests` - Создание запроса
- `GET /api/requests/:id` - Получение запроса по ID
- `POST /api/requests/:id/approve` - Одобрение запроса
- `POST /api/requests/:id/reject` - Отклонение запроса

#### Секреты
- `GET /api/secrets` - Список секретов (admin)
- `GET /api/secrets/:name` - Получение секрета
- `DELETE /api/secrets/:name` - Удаление секрета (admin)
- `POST /api/secrets/:name/rotate` - Ротация секрета (admin)

#### Аналитика
- `GET /api/analytics/overview` - Общая статистика
- `GET /api/analytics/requests` - Аналитика запросов
- `GET /api/analytics/users` - Аналитика пользователей
- `GET /api/analytics/audit` - Журнал аудита

### WebSocket события

#### Клиентские события
- `authenticate` - Аутентификация
- `join-user-room` - Присоединение к комнате пользователя
- `join-admin-room` - Присоединение к админской комнате

#### Серверные события
- `request-status-changed` - Изменение статуса запроса
- `new-request` - Новый запрос (для админов)
- `secret-access` - Доступ к секрету
- `system-notification` - Системные уведомления

## 🚀 Развертывание в продакшене

### 1. Подготовка окружения
```bash
# Создайте production .env файлы
cp backend/env.example backend/.env
cp frontend-client/env.example frontend-client/.env
cp frontend-admin/env.example frontend-admin/.env

# Настройте переменные для продакшена
```

### 2. Настройка Keycloak
1. Создайте realm для продакшена
2. Настройте клиентов для client и admin порталов
3. Создайте роли: `user`, `approver`, `admin`
4. Настройте пользователей и назначьте роли

### 3. Настройка OpenBao
1. Настройте политики доступа
2. Создайте токены для приложения
3. Настройте резервное копирование

### 4. Запуск в продакшене
```bash
# Используйте production docker-compose
docker compose -f docker-compose.prod.yml up -d

# Или используйте Kubernetes/Helm charts
```

## 🧪 Разработка

### Локальная разработка

1. **Запустите только внешние сервисы:**
   ```bash
   docker compose up postgres keycloak openbao
   ```

2. **Запустите backend в режиме разработки:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Запустите frontend в режиме разработки:**
   ```bash
   cd frontend-client
   npm install
   npm run dev
   
   cd frontend-admin
   npm install
   npm run dev
   ```

### Полезные команды

```bash
# Просмотр логов
docker compose logs -f backend
docker compose logs -f frontend-client

# Перезапуск сервиса
docker compose restart backend

# Очистка данных
docker compose down -v

# Сборка без кеша
docker compose build --no-cache
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте [Issues](../../issues) для существующих проблем
2. Создайте новый Issue с подробным описанием
3. Обратитесь к команде разработки

## 📈 Roadmap

### Ближайшие планы
- [ ] Полная реализация Admin Portal
- [ ] Расширенная аналитика с графиками
- [ ] API документация с Swagger
- [ ] Интеграция с внешними системами

### Долгосрочные планы
- [ ] Мобильное приложение
- [ ] Интеграция с CI/CD системами
- [ ] Автоматизация роли и политик
- [ ] Многофакторная аутентификация

---

**Создано командой Secret Manager для хакатона 2025** 🚀
