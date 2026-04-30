# Production Hardening Checklist

Последнее обновление: 2026-04-30

Этот чеклист отражает фактическое состояние репозитория и готовность к production запуску.

## 1) Secrets and Config

- [x] `.env` не должен коммититься (`.gitignore` настроен).
- [x] В репозитории есть безопасный шаблон `.env.example`.
- [x] `CRON_SECRET` обязателен для `/api/cron/ldap-sync` (fallback удален).
- [ ] Все production-секреты ротированы после исторического риска утечки.
- [ ] Добавлен runbook по регулярной ротации секретов (90 дней).

## 2) Auth / Access Control

- [x] Критичные support-ticket маршруты ограничены по ролям и tenant scope.
- [x] Начата унификация route-level проверок через общий helper слой (`requireSessionWithRoles`).
- [x] Telegram/webhooks маршруты переведены на общий auth-helper.
- [ ] Полностью перевести оставшиеся API routes на единый auth/tenant enforcement.

## 3) Data Isolation / Tenant Safety

- [x] Tenant-scoping применен для критичных операций чтения/изменения support tickets.
- [x] RLS-related утилиты присутствуют (`src/lib/prisma-rls.ts`).
- [ ] Добавить интеграционный smoke-тест на кросс-tenant запрет для дополнительных API (beyond support tickets).

## 4) Logging / Sensitive Data Redaction

- [x] Базовое audit logging используется в критичных бизнес-сценариях.
- [ ] Ввести централизованный helper для редактирования чувствительных полей в логах (tokens, secrets, credentials).
- [ ] Ограничить произвольные `console.*` в runtime-коде через policy/rule и безопасный logger wrapper.

## 5) CI Quality Gates

- [x] `bun run lint`
- [x] `bun run type-check`
- [x] `bun run test:ci` (минимальный regression-набор)
- [x] `bun run build`
- [ ] Добавить отдельный gate для security/dependency audit (с контролируемой политикой false-positive).

## 6) Release Checklist (операционный минимум)

- [x] Проверка сборки и regression перед merge/release.
- [x] Документация (`README.md`, `TESTING.md`, status docs) синхронизирована.
- [ ] Dry-run деплоя на staging с теми же шагами, что production.
- [ ] Проверка rollback процедуры на staging.
- [ ] Post-deploy smoke: login, tickets, billing webhook, health endpoint.

## 7) Webhook / Integrations Safety

- [x] Stripe webhook endpoint в проекте: `POST /api/webhooks/stripe`.
- [x] Проверка подписи Stripe webhook выполняется.
- [x] Telegram schema/API приведены к актуальному Prisma-контракту.
- [ ] Для production убедиться, что webhook signing secrets и retry/alerting policies задокументированы.

## 8) Итог по текущему моменту

- Статус hardening: **partial / in progress**.
- Технический baseline (build, type-check, regression, docs, key auth fixes): **пройден**.
- Остаточный риск: в основном процессный (секреты, release ops, централизация secure logging, полный охват auth-helper по всем API).
