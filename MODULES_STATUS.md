# Modules Status

Последнее обновление: 2026-04-30

Статусы: `stable` / `partial` / `planned`

## Core

- Multi-tenancy: `stable`
- Auth (NextAuth + roles): `stable`
- Tickets: `stable`
- Comments & unread indicators: `stable`
- Categories: `stable`
- Queues: `stable`
- Users & permissions: `stable`
- Audit log: `stable`
- Dashboard stats/charts: `stable`

## Advanced

- SLA policies: `partial` (ядро и API есть, требует расширенной проверки сценариев)
- Custom fields: `partial` (базово работает, нужны дополнительные регресс-тесты)
- Knowledge base: `partial` (основной flow есть, нужна стабилизация edge-cases)
- Automation rules: `partial` (основа есть, engine требует дальнейшей валидации)
- Assets (CMDB): `partial`
- Webhooks: `partial`
- LDAP/AD integration: `partial`
- Telegram integration: `partial`
- Billing (Stripe): `partial`

## Planned / next wave

- Unified auth enforcement layer across API routes.
- Minimum regression tests for critical flows.
- Production hardening checklist and CI quality gates.
