# ServiceDesk Beta

Multi-tenant ServiceDesk платформа на Next.js 14 + Prisma + PostgreSQL с тикетами, SLA, биллингом и интеграциями (LDAP/SSO/Telegram).

## Что есть в проекте

- Multi-tenant архитектура с tenant-aware API.
- Тикеты, комментарии, очереди, категории, SLA.
- Биллинг через Stripe (FREE / PRO / ENTERPRISE).
- LDAP/AD, OAuth (Google / Azure AD), NextAuth.
- База знаний, вебхуки, уведомления, аудит действий.
- Docker Compose окружение с PostgreSQL, Redis, Prometheus, Grafana и опциональным Nginx.

## Технологии

- `Next.js 14` (App Router), `React 18`, `TypeScript`
- `Prisma` + `PostgreSQL`
- `NextAuth`
- `Tailwind CSS`, `Radix UI`, `shadcn/ui`
- `Stripe`, `ldapjs`, `Sentry`, `prom-client`
- `Bun` как основной package manager/runtime

## Быстрый старт (локально)

### 1) Установка зависимостей

```bash
bun install
```

### 2) Настройка окружения

```bash
cp .env.example .env
```

Заполните минимум:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `CRON_SECRET`

Для Stripe/SSO/LDAP добавьте соответствующие переменные по необходимости.

### 3) Поднять базу (опционально через Docker)

```bash
docker-compose up -d postgres
```

### 4) Применить миграции Prisma

```bash
bunx prisma migrate dev
```

### 5) Запустить dev-сервер

```bash
bun run dev
```

Приложение: `http://localhost:3000`

## Доступные команды

Скрипты из `package.json`:

```bash
bun run dev          # запуск разработки
bun run build        # production build
bun run start        # запуск production-сервера
bun run lint         # eslint

bun run db:generate  # prisma generate
bun run db:migrate   # prisma migrate dev
bun run db:push      # prisma db push
bun run db:studio    # prisma studio
```

## Docker Compose (production-like)

Запуск основного стека:

```bash
docker-compose up -d
```

С Nginx-профилем:

```bash
docker-compose --profile production up -d
```

Проверка:

```bash
docker-compose ps
curl http://localhost:3000/api/health
```

## Структура репозитория

```text
src/
  app/               # routes + API (App Router)
  components/        # UI компоненты
  lib/               # бизнес-логика и интеграции
prisma/
  schema.prisma
  migrations/
docs/
monitoring/
nginx/
```

## Документация в репозитории

- `TESTING.md` — сценарии ручного тестирования.
- `docs/AD_SETUP_GUIDE.md` — подключение Active Directory.
- `docs/AD_QUICK_START.md` — быстрый старт AD.
- `docs/LDAP_SYNC_GUIDE.md` — синхронизация LDAP.
- `docs/RLS_SECURITY.md` — заметки по изоляции/безопасности.

## Важно про тесты и CI

- В workflow `/.github/workflows/ci-cd.yml` используются команды `bun run type-check` и `bun run test:ci`.
- В текущем `package.json` эти скрипты не определены.
- Это известное несоответствие и будет исправляться отдельной задачей из TODO (блок тестов/quality gates).

## Лицензия

См. `LICENSE`.
