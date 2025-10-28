# 🧪 Руководство по тестированию OnPoints.it

## 📋 Содержание
1. [Локальное тестирование](#локальное-тестирование)
2. [Тестирование Billing (Stripe)](#тестирование-billing-stripe)
3. [Тестирование SSO (Google, Azure AD)](#тестирование-sso-google-azure-ad)
4. [Тестирование Telegram Bot](#тестирование-telegram-bot)
5. [Тестирование Custom Domains](#тестирование-custom-domains)
6. [Тестирование RLS (Row-Level Security)](#тестирование-rls-row-level-security)
7. [E2E Testing](#e2e-testing)

---

## 🏠 Локальное тестирование

### Запуск dev сервера
```bash
# 1. Установка зависимостей
bun install

# 2. Настройка .env
cp .env.example .env
# Редактируйте .env файл с вашими credentials

# 3. Миграция БД
bunx prisma migrate dev

# 4. Запуск dev сервера
bun run dev
```

### Проверка базовых функций
- ✅ Логин/регистрация
- ✅ Создание tenant
- ✅ Создание пользователей (USER, AGENT, TENANT_ADMIN)
- ✅ Создание тикетов
- ✅ Комментарии
- ✅ Уведомления о непрочитанных сообщениях

---

## 💳 Тестирование Billing (Stripe)

### 1. Настройка Stripe Test Mode

1. Зарегистрируйтесь на [Stripe Dashboard](https://dashboard.stripe.com)
2. Переключитесь в **Test Mode** (toggle в правом верхнем углу)
3. Получите API ключи:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

### 2. Настройка .env
```env
STRIPE_SECRET_KEY=sk_test_ваш_ключ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ваш_ключ
STRIPE_WEBHOOK_SECRET=whsec_ваш_webhook_secret
```

### 3. Локальное тестирование Stripe Webhooks

Установите Stripe CLI:
```bash
# Windows (через Scoop)
scoop install stripe

# macOS (через Homebrew)
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
```

Запустите webhook listener:
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

**Скопируйте webhook signing secret** (начинается с `whsec_`) и добавьте в `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Тестовые карты Stripe

| Карта | Сценарий |
|-------|----------|
| `4242 4242 4242 4242` | ✅ Успешная оплата |
| `4000 0000 0000 0002` | ❌ Отклонена картой |
| `4000 0025 0000 3155` | 🔐 Требует 3D Secure |
| `4000 0000 0000 9995` | ⏰ Недостаточно средств |

**Любая будущая дата** (например, `12/34`) и **любой CVC** (например, `123`)

### 5. Сценарий тестирования

1. **Войдите как TENANT_ADMIN**
2. Перейдите в `/dashboard/billing`
3. Нажмите **"Upgrade to PRO"** или **"Upgrade to ENTERPRISE"**
4. Заполните форму:
   - Email: `test@example.com`
   - Карта: `4242 4242 4242 4242`
   - Дата: `12/34`
   - CVC: `123`
5. Нажмите **"Subscribe"**
6. Проверьте:
   - ✅ Webhook получен (в консоли Stripe CLI)
   - ✅ Subscription создана в БД
   - ✅ Plan обновлен в UI
   - ✅ Лимиты изменились

### 6. Тестирование лимитов

**FREE Plan:**
- Создайте 11 пользователей → **должна быть ошибка** на 11-м
- Создайте 3 агентов → **должна быть ошибка** на 4-м

**PRO Plan:**
- Создайте 51 пользователя → **должна быть ошибка** на 51-м
- Создайте 11 агентов → **должна быть ошибка** на 11-м

---

## 🔐 Тестирование SSO (Google, Azure AD)

### 1. Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Включите **Google+ API**
4. Перейдите в **APIs & Services → Credentials**
5. Нажмите **Create Credentials → OAuth client ID**
6. Выберите **Web application**
7. Добавьте **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
8. Скопируйте **Client ID** и **Client Secret**

### 2. Настройка .env
```env
GOOGLE_CLIENT_ID=ваш_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ваш_client_secret
NEXT_PUBLIC_GOOGLE_ENABLED=true
```

### 3. Настройка Azure AD OAuth

1. Перейдите в [Azure Portal](https://portal.azure.com/)
2. Откройте **Azure Active Directory → App registrations**
3. Нажмите **New registration**
4. Добавьте **Redirect URI**:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
5. Скопируйте **Application (client) ID** и **Directory (tenant) ID**
6. Создайте **Client secret** в **Certificates & secrets**

### 4. Настройка .env
```env
AZURE_AD_CLIENT_ID=ваш_client_id
AZURE_AD_CLIENT_SECRET=ваш_client_secret
AZURE_AD_TENANT_ID=ваш_tenant_id
NEXT_PUBLIC_AZURE_AD_ENABLED=true
```

### 5. Сценарий тестирования

1. Перейдите на `/login`
2. Нажмите **"Login with Google"** или **"Login with Azure AD"**
3. Авторизуйтесь через OAuth
4. Проверьте:
   - ✅ Новый пользователь создан в БД (role: `USER`, tenantId: `null`)
   - ✅ Пользователь перенаправлен на `/dashboard`
   - ✅ Global ADMIN может назначить пользователя в tenant через UI

---

## 🤖 Тестирование Telegram Bot

### 1. Создание Telegram Bot

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте `/newbot`
3. Введите имя бота (например, `OnPoints Test Bot`)
4. Введите username (например, `onpoints_test_bot`)
5. Скопируйте **Bot Token** (например, `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Настройка Webhook URL

Для локального тестирования используйте **ngrok**:

```bash
# Установите ngrok
npm install -g ngrok

# Запустите ngrok
ngrok http 3000
```

Скопируйте **HTTPS URL** (например, `https://abc123.ngrok.io`)

### 3. Настройка в UI

1. Войдите как **TENANT_ADMIN**
2. Перейдите в `/dashboard/settings/telegram`
3. Введите:
   - **Bot Token**: `123456789:ABCdefGHI...`
   - **Bot Username**: `@onpoints_test_bot`
   - **Group Chat ID** (опционально): `-1001234567890`
4. Нажмите **"Save"**
5. Webhook URL установится автоматически:
   ```
   https://abc123.ngrok.io/api/telegram/webhook/{tenantId}
   ```

### 4. Сценарий тестирования

**Создание тикета через Telegram:**
1. Откройте бота в Telegram
2. Отправьте `/start`
3. Отправьте `/ticket Проблема с принтером | Принтер не печатает`
4. Проверьте:
   - ✅ Тикет создан в БД
   - ✅ Ticket number сгенерирован (например, `TENANT-001`)
   - ✅ Уведомление отправлено в группу (если настроено)

**Линковка Telegram аккаунта:**
1. Отправьте `/link`
2. Бот отправит инструкцию
3. В UI создайте ссылку: `/dashboard/users → Link Telegram`
4. Отправьте код подтверждения в бот

---

## 🌐 Тестирование Custom Domains

### 1. Настройка DNS

Добавьте **CNAME** запись в вашем DNS провайдере:

```
support.example.com → onpoints.it
```

### 2. DNS Verification

1. Войдите как **TENANT_ADMIN**
2. Перейдите в `/dashboard/settings/domains`
3. Введите **Custom Domain**: `support.example.com`
4. Нажмите **"Verify Domain"**
5. Система сгенерирует **TXT record**:
   ```
   _onpoints-verify.support.example.com TXT "abc123def456"
   ```
6. Добавьте этот TXT record в DNS
7. Нажмите **"Check Verification"**
8. После успешной верификации домен станет активным

### 3. SSL Certificate

После верификации запустите скрипт:
```bash
bash scripts/setup-ssl.sh support.example.com
```

Это создаст Let's Encrypt сертификат и настроит Nginx.

### 4. Тестирование

Проверьте доступность:
```bash
curl -I https://support.example.com
```

---

## 🔒 Тестирование RLS (Row-Level Security)

### 1. Создание тестовых данных

```sql
-- Создайте 2 тенанта
INSERT INTO tenants (id, name, slug) VALUES 
  ('tenant1', 'Tenant 1', 'tenant1'),
  ('tenant2', 'Tenant 2', 'tenant2');

-- Создайте пользователей в каждом тенанте
INSERT INTO users (email, name, password, role, "tenantId") VALUES
  ('user1@tenant1.com', 'User 1', 'hashed', 'USER', 'tenant1'),
  ('user2@tenant2.com', 'User 2', 'hashed', 'USER', 'tenant2');

-- Создайте тикеты для каждого тенанта
INSERT INTO tickets (title, description, "creatorId", "tenantId") VALUES
  ('Ticket Tenant 1', 'Description', 'user1_id', 'tenant1'),
  ('Ticket Tenant 2', 'Description', 'user2_id', 'tenant2');
```

### 2. Тестирование изоляции

**Запрос от tenant1:**
```sql
SET app.tenant_id = 'tenant1';
SELECT * FROM tickets;
-- Должен вернуть только тикеты tenant1
```

**Запрос от tenant2:**
```sql
SET app.tenant_id = 'tenant2';
SELECT * FROM tickets;
-- Должен вернуть только тикеты tenant2
```

**Запрос от глобального ADMIN:**
```sql
SET app.tenant_id = '';
SELECT * FROM tickets;
-- Должен вернуть ВСЕ тикеты
```

### 3. UI Тестирование

1. Войдите как **user1@tenant1.com**
2. Перейдите в `/dashboard/tickets`
3. Проверьте, что видите **только тикеты tenant1**
4. Выйдите и войдите как **user2@tenant2.com**
5. Проверьте, что видите **только тикеты tenant2**

---

## 🧪 E2E Testing

### Установка Playwright

```bash
bun add -D @playwright/test
bunx playwright install
```

### Пример теста

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[type="email"]', 'admin@onpoints.it');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('should create ticket', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@onpoints.it');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  // Navigate to tickets
  await page.goto('http://localhost:3000/dashboard/tickets');
  await page.click('button:has-text("Создать тикет")');
  
  // Fill form
  await page.fill('input[name="title"]', 'Test Ticket');
  await page.fill('textarea[name="description"]', 'Test Description');
  await page.selectOption('select[name="priority"]', 'HIGH');
  await page.click('button[type="submit"]');
  
  // Verify ticket created
  await expect(page.locator('text=Test Ticket')).toBeVisible();
});
```

### Запуск тестов

```bash
bunx playwright test
```

---

## 📊 Мониторинг и Логи

### Prometheus Metrics
```bash
curl http://localhost:3000/api/metrics
```

### Sentry Errors
Проверьте [Sentry Dashboard](https://sentry.io) для ошибок в production.

### Логи Prisma
```bash
# В .env
DEBUG=prisma:query
```

---

## ✅ Checklist перед Production

- [ ] Все тесты пройдены
- [ ] RLS работает корректно
- [ ] Stripe billing протестирован
- [ ] SSO работает (Google, Azure AD)
- [ ] Telegram bot отвечает на команды
- [ ] Custom domains верифицируются
- [ ] SSL сертификаты настроены
- [ ] Backup стратегия настроена
- [ ] Monitoring (Prometheus + Grafana) работает
- [ ] Sentry отслеживает ошибки
- [ ] CI/CD pipeline работает

---

**🎉 Готово! Ваша платформа OnPoints.it готова к деплою!**

