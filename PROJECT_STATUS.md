# Project Status

Последнее обновление: 2026-04-30

## Текущее состояние

- Build: `bun run build` проходит успешно.
- Lint: `bun run lint` проходит с предупреждениями `react-hooks/exhaustive-deps`.
- Документация: `README.md` и `TESTING.md` приведены к фактическому состоянию проекта.

## Что стабильно работает

- Аутентификация/авторизация (NextAuth, роли).
- Tenant-изоляция на критичных маршрутах тикетов.
- Базовый ticketing flow (тикеты, комментарии, статусы, приоритеты).
- Категории, очереди, пользователи, уведомления, фильтры.
- Billing UI и Stripe интеграция на уровне основных API маршрутов.
- LDAP/Telegram/Webhooks маршруты присутствуют и приведены к текущей Prisma-схеме.

## Что требует дальнейшей доработки

- Единый слой авторизации/tenant-проверок без дублирования по route handlers.
- Минимальный регрессионный набор автотестов (auth, tenant isolation, critical API).
- Финальная выверка документации статусов (`MODULES_STATUS.md`, `FINAL_STATUS.md`, `SERVER_STATUS.md`).
- Production hardening checklist (секреты, quality gates, release checklist).

## Принятый рабочий порядок

1. Стабилизировать сборку и типы (выполнено).
2. Синхронизировать документацию с реальным кодом (в процессе).
3. Закрыть тестовый минимум и hardening (следующий этап).

## Ближайшие задачи (активный backlog)

- `telegram-schema-api-alignment`
- `auth-enforcement-refactor`
- `tests-minimum-regression`
- `production-hardening-checklist`
