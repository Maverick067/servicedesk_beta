# Row-Level Security (RLS) Documentation

## 📋 Overview

Row-Level Security (RLS) обеспечивает **полную изоляцию данных между tenants** на уровне PostgreSQL базы данных. Это критически важно для мультитенантного SaaS приложения.

## 🔐 Как это работает

### 1. PostgreSQL RLS Policies

Для каждой таблицы с `tenantId` создана RLS policy, которая автоматически фильтрует строки:

```sql
CREATE POLICY ticket_access_policy ON "tickets"
  FOR ALL
  USING (
    is_global_admin() OR 
    "tenantId" = current_tenant_id()
  );
```

**Что это значит:**
- Обычные пользователи видят только данные своего tenant
- Глобальные ADMIN видят все данные (для управления платформой)
- Фильтрация происходит **на уровне БД**, даже если в коде есть ошибка

### 2. Session Variables

Перед каждым запросом устанавливаются PostgreSQL session variables:

```sql
SET LOCAL app.tenant_id = '<tenant-uuid>';
SET LOCAL app.is_admin = 'true/false';
```

Эти переменные используются RLS policies для определения доступа.

### 3. Prisma Middleware

Автоматически устанавливает RLS контекст для каждого запроса через Prisma:

```typescript
// В src/lib/prisma-rls.ts
export async function setRLSContext(
  prisma: PrismaClient,
  context: RLSContext
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SET LOCAL app.tenant_id = '${context.tenantId}'`
  );
  await prisma.$executeRawUnsafe(
    `SET LOCAL app.is_admin = '${context.isAdmin}'`
  );
}
```

### 4. API Helper Functions

Для упрощения использования созданы helper функции:

```typescript
import { getAuthenticatedSession } from '@/lib/api-helpers';

// В любом API route:
export async function GET(request: Request) {
  // Автоматически:
  // 1. Проверяет авторизацию
  // 2. Устанавливает RLS контекст
  // 3. Возвращает session
  const session = await getAuthenticatedSession();

  // Теперь все запросы через Prisma автоматически изолированы!
  const tickets = await prisma.ticket.findMany();
  
  return NextResponse.json(tickets);
}
```

## 🛡️ Защищенные таблицы

RLS включен для следующих таблиц:

- ✅ `users`
- ✅ `tickets`
- ✅ `categories`
- ✅ `comments`
- ✅ `attachments`
- ✅ `category_agent_assignments`
- ✅ `notifications`
- ✅ `comment_reads`
- ✅ `user_invitations`
- ✅ `audit_logs`
- ✅ `queues`
- ✅ `sla_policies`
- ✅ `custom_fields`
- ✅ `custom_field_values`
- ✅ `notification_settings`
- ✅ `notification_groups`
- ✅ `saved_filters`
- ✅ `knowledge_articles`
- ✅ `automation_rules`
- ✅ `assets`
- ✅ `webhooks`
- ✅ `webhook_deliveries`
- ✅ `ldap_configs`

## 📖 Использование в API Routes

### Базовый пример

```typescript
import { getAuthenticatedSession, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Устанавливаем RLS контекст
    const session = await getAuthenticatedSession();

    // Все запросы автоматически изолированы по tenant
    const tickets = await prisma.ticket.findMany({
      where: {
        // tenantId уже фильтруется через RLS, 
        // но можно добавить дополнительные условия
        status: 'OPEN',
      },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### С проверкой доступа к конкретному tenant

```typescript
import { 
  getAuthenticatedSession, 
  checkTenantAccess, 
  handleApiError 
} from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    const session = await getAuthenticatedSession();

    // Проверяем, имеет ли пользователь доступ к этому tenant
    checkTenantAccess(session, params.tenantId);

    // ... rest of the code
  } catch (error) {
    return handleApiError(error);
  }
}
```

### С проверкой ролей

```typescript
import { 
  getAuthenticatedSession, 
  requireRole, 
  handleApiError 
} from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    // Только ADMIN и TENANT_ADMIN могут выполнить это действие
    requireRole(session, ['ADMIN', 'TENANT_ADMIN']);

    // ... rest of the code
  } catch (error) {
    return handleApiError(error);
  }
}
```

### С проверкой permissions

```typescript
import { 
  getAuthenticatedSession, 
  requirePermission, 
  handleApiError 
} from '@/lib/api-helpers';

export async function DELETE(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    // Проверяем, есть ли у пользователя permission на удаление
    requirePermission(session, 'ticket.delete');

    // ... rest of the code
  } catch (error) {
    return handleApiError(error);
  }
}
```

## 🧪 Тестирование изоляции

### Проверка RLS вручную

```sql
-- Войти в psql
psql -U postgres -d servicedesk

-- Установить tenant context
SET app.tenant_id = 'tenant-uuid-1';
SET app.is_admin = 'false';

-- Проверить, что видны только данные этого tenant
SELECT id, "tenantId", title FROM tickets;

-- Сменить tenant
SET app.tenant_id = 'tenant-uuid-2';

-- Проверить, что теперь видны другие данные
SELECT id, "tenantId", title FROM tickets;
```

### Автоматические тесты

См. `scripts/test-rls-isolation.ts` для автоматических тестов изоляции.

## ⚠️ Важные моменты

### 1. Глобальные администраторы

Пользователи с ролью `ADMIN` и `tenantId = null` имеют доступ ко **всем** данным всех tenants. Это необходимо для управления платформой.

```typescript
const session = {
  user: {
    id: 'admin-id',
    role: 'ADMIN',
    tenantId: null, // ← Глобальный админ
  }
};

// RLS context:
await setRLSContext(prisma, {
  tenantId: null,
  isAdmin: true, // ← Флаг для RLS policies
});
```

### 2. Связанные таблицы

Для таблиц без прямого `tenantId` (например, `comments`), RLS проверяет доступ через связи:

```sql
CREATE POLICY comment_access_policy ON "comments"
  FOR ALL
  USING (
    is_global_admin() OR 
    EXISTS (
      SELECT 1 FROM "tickets" t 
      WHERE t.id = "comments"."ticketId" 
      AND t."tenantId" = current_tenant_id()
    )
  );
```

### 3. Performance

RLS может немного замедлить запросы. Для оптимизации:

1. ✅ Созданы индексы на `tenantId`
2. ✅ RLS policies используют эффективные условия
3. ✅ Session variables устанавливаются один раз за запрос

### 4. Debugging

Для отладки RLS в development mode:

```typescript
// В src/lib/prisma-rls.ts включено логирование
logRLSEvent('query', context, { model: 'Ticket' });
```

## 🚀 Применение RLS

### При первой настройке

```bash
# Применить RLS миграцию
bun run scripts/apply-rls.ts

# Проверить статус
bun run scripts/check-rls-status.ts
```

### После изменений в схеме

```bash
# После добавления новых таблиц с tenantId
# 1. Обновить enable_rls.sql
# 2. Применить снова
bun run scripts/apply-rls.ts
```

## 📝 Checklist для новых таблиц

При добавлении новой таблицы с `tenantId`:

- [ ] Добавить `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` в `enable_rls.sql`
- [ ] Создать RLS policy для таблицы
- [ ] Создать индекс на `tenantId` (если нужно)
- [ ] Добавить тесты изоляции
- [ ] Обновить эту документацию

## 🔗 Связанные файлы

- `prisma/migrations/enable_rls.sql` - SQL миграция для RLS
- `src/lib/prisma-rls.ts` - Prisma middleware и helper функции
- `src/lib/api-helpers.ts` - Helper функции для API routes
- `scripts/apply-rls.ts` - Скрипт для применения RLS
- `scripts/test-rls-isolation.ts` - Тесты изоляции

## ✅ Acceptance Criteria

**Изоляция работает, если:**

1. ✅ Пользователь Tenant A **не может** получить доступ к данным Tenant B через API
2. ✅ Пользователь Tenant A **не может** получить доступ к данным Tenant B даже через прямой SQL
3. ✅ Глобальный ADMIN **может** видеть данные всех tenants
4. ✅ При попытке несанкционированного доступа возвращается 403 Forbidden
5. ✅ RLS не замедляет запросы значительно (< 10ms overhead)

---

**Последнее обновление:** Создано при внедрении RLS в Sprint 1

