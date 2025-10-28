# 📊 Sprint 3: Billing & Subscriptions - Прогресс

## ✅ Что реализовано (50%)

### 1. 🗄️ Database Models (100% ✅)

Добавлены модели в `prisma/schema.prisma`:

#### **Subscription Model**
```prisma
model Subscription {
  id                      String              @id @default(cuid())
  tenantId                String              @unique
  plan                    PlanType            @default(FREE)
  status                  SubscriptionStatus  @default(ACTIVE)
  
  // Stripe IDs
  stripeCustomerId        String?             @unique
  stripeSubscriptionId    String?             @unique
  stripePriceId           String?
  
  // Период подписки
  currentPeriodStart      DateTime?
  currentPeriodEnd        DateTime?
  cancelAtPeriodEnd       Boolean             @default(false)
  
  // Лимиты тарифного плана
  maxUsers                Int                 @default(10)
  maxAgents               Int                 @default(2)
  maxStorageGB            Int                 @default(1)
  maxTicketsPerMonth      Int?
  
  // Включенные функции
  ssoEnabled              Boolean             @default(false)
  customDomainEnabled     Boolean             @default(false)
  apiAccessEnabled        Boolean             @default(false)
  prioritySupportEnabled  Boolean             @default(false)
  customBrandingEnabled   Boolean             @default(false)
  
  tenant                  Tenant              @relation(...)
  invoices                Invoice[]
  usageRecords            UsageRecord[]
}
```

#### **Invoice Model**
- Хранение информации о счетах
- Интеграция с Stripe Invoice API
- PDF URLs, hosted pages

#### **UsageRecord Model**
- Метрики использования (users, agents, storage, tickets, api_calls)
- Периодическая агрегация для биллинга

#### **Enums**
```typescript
enum PlanType {
  FREE        // 10 users, 2 agents, 1GB
  PRO         // 50 users, 15 agents, 20GB
  ENTERPRISE  // Unlimited
}

enum SubscriptionStatus {
  ACTIVE, TRIALING, PAST_DUE, CANCELED, INCOMPLETE, UNPAID
}
```

### 2. 💳 Stripe Integration (100% ✅)

Создан файл `src/lib/stripe.ts` с полной интеграцией:

#### **Функции:**
- ✅ `createCheckoutSession()` - Создание Stripe Checkout для оформления подписки
- ✅ `createPortalSession()` - Stripe Customer Portal для управления подпиской
- ✅ `getStripeSubscription()` - Получение информации о подписке
- ✅ `cancelSubscription()` - Отмена подписки (в конце периода)
- ✅ `resumeSubscription()` - Возобновление подписки
- ✅ `getInvoices()` - Список счетов
- ✅ `createUsageRecord()` - Создание usage records для метрик
- ✅ `constructWebhookEvent()` - Верификация Stripe webhooks

#### **Конфигурация планов:**
```typescript
STRIPE_PLANS = {
  FREE: {
    price: 0,
    features: ['10 users', '2 agents', '1GB', 'Basic tickets', 'Email support'],
    limits: { maxUsers: 10, maxAgents: 2, maxStorageGB: 1, maxTicketsPerMonth: 100 }
  },
  PRO: {
    price: 49,
    features: ['50 users', '15 agents', '20GB', 'SLA', 'KB', 'CMDB', 'Priority support'],
    limits: { maxUsers: 50, maxAgents: 15, maxStorageGB: 20, maxTicketsPerMonth: null }
  },
  ENTERPRISE: {
    price: 199,
    features: ['Unlimited', 'All modules', 'SSO', 'Custom domain', 'API', '24/7 support'],
    limits: { maxUsers: 999999, maxAgents: 999999, maxStorageGB: 1000, maxTicketsPerMonth: null }
  }
}
```

---

## ⏳ Что осталось сделать (50%)

### 3. 🔗 Stripe Webhook Handler (Pending)
**Файл:** `src/app/api/webhooks/stripe/route.ts`

Нужно обработать события:
- `checkout.session.completed` - Успешная оплата, создать Subscription
- `invoice.paid` - Платёж прошёл, создать Invoice record
- `invoice.payment_failed` - Ошибка платежа, обновить status → PAST_DUE
- `customer.subscription.updated` - Обновление подписки (upgrade/downgrade)
- `customer.subscription.deleted` - Отмена подписки, обновить status → CANCELED

### 4. 🚦 Subscription Limits Middleware (Pending)
**Файл:** `src/middleware/subscription-limits.ts`

Проверки перед операциями:
```typescript
// Пример логики
async function checkUserLimit(tenantId: string) {
  const subscription = await getSubscription(tenantId);
  const currentUsers = await countUsers(tenantId);
  
  if (currentUsers >= subscription.maxUsers) {
    throw new Error('User limit reached. Please upgrade your plan.');
  }
}
```

Аналогично для:
- `checkAgentLimit()`
- `checkStorageLimit()`
- `checkTicketLimit()`
- `checkModuleAccess()` (SSO, API, custom domain)

### 5. 🎨 Billing UI (Pending)

#### **5.1. Pricing Page** (`src/app/dashboard/billing/pricing/page.tsx`)
- Карточки с тарифами (FREE, PRO, ENTERPRISE)
- Кнопка "Upgrade" → Stripe Checkout
- Показ текущего плана

#### **5.2. Subscription Page** (`src/app/dashboard/billing/page.tsx`)
- Текущий план и статус
- Использование лимитов (progress bars):
  - Users: 8/10 (80%)
  - Agents: 2/2 (100%)
  - Storage: 0.5GB/1GB (50%)
- Кнопка "Manage Subscription" → Stripe Portal
- История платежей (список Invoice)

#### **5.3. Components**
- `<PlanCard />` - Карточка тарифа
- `<UsageMeter />` - Индикатор использования лимита
- `<InvoiceList />` - Список счетов

---

## 📦 Установленные зависимости

```json
{
  "stripe": "^19.1.0"
}
```

---

## 🔧 Environment Variables

Необходимо добавить в `.env`:
```env
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_ENTERPRISE="price_..."
```

**Где получить:**
1. Stripe Dashboard → API keys: https://dashboard.stripe.com/test/apikeys
2. Создать Products → Цены для PRO и ENTERPRISE

---

## 🧪 Тестирование

### Stripe Test Cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

### Stripe CLI для webhooks:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 📊 Статистика

- **Модели:** 3 (Subscription, Invoice, UsageRecord)
- **Enums:** 2 (PlanType, SubscriptionStatus)
- **Stripe функции:** 8
- **Тарифы:** 3 (FREE, PRO, ENTERPRISE)
- **Прогресс:** 50% ✅

---

## 🚀 Следующие шаги

1. Создать Stripe Webhook Handler
2. Реализовать Subscription Limits Middleware
3. Создать Billing UI (pricing + subscription pages)
4. Интегрировать проверки лимитов в API endpoints
5. Добавить автоматическое создание FREE подписки при регистрации tenant

---

## 🎯 Готовность к продакшену

- [x] Database schema
- [x] Stripe integration utilities
- [ ] Webhook handler (security critical!)
- [ ] Limits enforcement
- [ ] UI для управления подписками
- [ ] Тесты

**Estimated time to complete:** ~4-6 часов

---

**Дата:** 2025-01-27  
**Sprint:** 3 (Billing)  
**Статус:** 🟡 In Progress (50%)

