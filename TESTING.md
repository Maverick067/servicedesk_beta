# TESTING.md

Практическое руководство по проверке `servicedesk_beta` в текущем состоянии репозитория.

## 1) Базовый smoke-check

### Подготовка

```bash
bun install
cp .env.example .env
```

Заполните минимум в `.env`:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `CRON_SECRET`

### Локальный запуск

```bash
docker-compose up -d postgres
bunx prisma migrate dev
bun run dev
```

Откройте:

- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`

### Проверка сборки

```bash
bun run build
```

## 2) Проверка аутентификации и ролей

Проверить сценарии:

- вход пользователя;
- доступ к dashboard;
- ограничение административных страниц для не-admin ролей;
- запрет кросс-tenant доступа к данным через API.

Критичные API для ручной проверки:

- `GET /api/support-tickets/[id]`
- `PATCH /api/support-tickets/[id]`
- `POST /api/support-tickets/[id]/comments`

Ожидание: данные и действия доступны только в пределах tenant и разрешённой роли.

## 3) Проверка RLS / tenant isolation

В репозитории есть скрипт:

```bash
bunx tsx scripts/test-rls-isolation.ts
```

Ручной сценарий:

1. Создать 2 tenant.
2. В tenant A создать тикет.
3. Пользователем tenant B попытаться читать/изменять этот тикет.
4. Убедиться в отказе доступа (404/403 по логике route).

## 4) Billing и Stripe

### Обязательные env (для тестового Stripe)

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Важный endpoint webhook

Фактический роут в проекте:

- `POST /api/webhooks/stripe`

Локальный listener:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Проверить в UI:

1. `/dashboard/billing`
2. переход на checkout;
3. возврат после оплаты;
4. обновление статуса подписки.

## 5) Telegram

Основные роуты:

- `GET/POST /api/telegram/bot`
- `POST /api/telegram/webhook/[tenantId]`

Проверить:

1. сохранение настроек бота в UI (`/dashboard/settings/telegram`);
2. получение webhook update;
3. создание тикета/уведомления через Telegram сценарий.

## 6) LDAP / AD

Основные роуты:

- `POST /api/ldap/test-connection`
- `POST /api/ldap/[id]/sync`
- `GET /api/cron/ldap-sync` (защищён `CRON_SECRET`)

Проверить:

1. тест подключения;
2. ручной sync;
3. что cron endpoint возвращает ошибку без секрета.

## 7) Полезные команды диагностики

```bash
# линт
bun run lint

# build
bun run build

# docker logs
docker-compose logs -f app
docker-compose logs -f postgres
```

## 8) Известные ограничения на сейчас

- В `package.json` нет скриптов `type-check` и `test:ci`, хотя они используются в `/.github/workflows/ci-cd.yml`.
- Автотесты как единый стабильный набор ещё формируются (задача в TODO: minimum regression tests).

---

Последнее обновление: 2026-04-30
