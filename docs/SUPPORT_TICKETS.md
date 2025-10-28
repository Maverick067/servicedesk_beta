# 🎫 Система Support-тикетов

Система обращений администраторов организаций к супер-администраторам платформы.

## Обзор

Support-тикеты — это специальный тип тикетов для общения между:
- **Tenant Admin** (администратор организации) → **Super Admin** (администратор платформы)

В отличие от обычных тикетов, которые создаются пользователями внутри организации, support-тикеты предназначены для вопросов, проблем и запросов, связанных с управлением платформой, тарифами, модулями и другими вопросами уровня системы.

## Использование

### Для Tenant Admin (Администратор организации)

#### 1. Создание support-тикета

**Шаг 1:** Войдите как администратор организации
```
Email: admin@demo.com
Пароль: admin123
```

**Шаг 2:** Перейдите в раздел "Техподдержка" в боковом меню

**Шаг 3:** Нажмите "Создать обращение"

**Шаг 4:** Заполните форму:
- **Тема** - краткое описание проблемы
- **Описание** - подробное описание вопроса или проблемы
- **Приоритет** - LOW, MEDIUM, HIGH, URGENT

**Шаг 5:** Нажмите "Создать обращение"

#### 2. Просмотр своих тикетов

Все ваши обращения отображаются на странице "Техподдержка". Вы можете:
- Просматривать статус тикетов
- Читать ответы от супер-админа
- Отвечать на комментарии

### Для Super Admin (Супер-администратор)

#### 1. Просмотр всех support-тикетов

**Шаг 1:** Войдите как супер-админ
```
Email: superadmin@servicedesk.com
Пароль: superadmin
```

**Шаг 2:** В sidebar выберите "Support Тикеты" (под админ-панелью)

**Шаг 3:** Вы увидите список всех обращений от всех организаций

#### 2. Обработка тикетов

- Нажмите на тикет для просмотра деталей
- Читайте описание проблемы
- Отвечайте на вопросы
- Изменяйте статус тикета
- Закрывайте решённые тикеты

## Статусы тикетов

| Статус | Описание | Кто устанавливает |
|--------|----------|-------------------|
| **OPEN** | Новый тикет | Автоматически при создании |
| **IN_PROGRESS** | В работе | Super Admin |
| **PENDING** | Ожидание ответа | Super Admin или Tenant Admin |
| **RESOLVED** | Решён | Super Admin |
| **CLOSED** | Закрыт | Super Admin или Tenant Admin |

## Приоритеты

| Приоритет | Когда использовать |
|-----------|-------------------|
| **LOW** | Общие вопросы, не требующие срочного ответа |
| **MEDIUM** | Стандартные запросы |
| **HIGH** | Важные проблемы, влияющие на работу |
| **URGENT** | Критические проблемы, требующие немедленного решения |

## API Endpoints

### Получить список тикетов
```http
GET /api/support-tickets
Authorization: Required (ADMIN or TENANT_ADMIN)

Response:
[
  {
    "id": "clx123...",
    "number": 1,
    "title": "Вопрос по тарифам",
    "description": "...",
    "status": "OPEN",
    "priority": "MEDIUM",
    "tenantId": "...",
    "creatorId": "...",
    "createdAt": "2025-01-28T...",
    "tenant": {
      "name": "Demo Company",
      "slug": "demo"
    },
    "_count": {
      "comments": 2
    }
  }
]
```

### Создать тикет (только TENANT_ADMIN)
```http
POST /api/support-tickets
Authorization: Required (TENANT_ADMIN)
Content-Type: application/json

Body:
{
  "title": "Нужна помощь с настройкой LDAP",
  "description": "Не могу подключить Active Directory...",
  "priority": "HIGH"
}

Response: 201 Created
{
  "id": "clx123...",
  "number": 5,
  ...
}
```

### Получить детали тикета
```http
GET /api/support-tickets/[id]
Authorization: Required

Response:
{
  "id": "...",
  "title": "...",
  "comments": [
    {
      "id": "...",
      "content": "...",
      "authorId": "...",
      "isInternal": false,
      "createdAt": "..."
    }
  ]
}
```

### Обновить статус тикета
```http
PATCH /api/support-tickets/[id]
Authorization: Required
Content-Type: application/json

Body:
{
  "status": "RESOLVED",
  "priority": "MEDIUM"
}
```

### Добавить комментарий
```http
POST /api/support-tickets/[id]/comments
Authorization: Required
Content-Type: application/json

Body:
{
  "content": "Спасибо за обращение! Мы проверим вашу проблему...",
  "isInternal": false
}
```

## Внутренние комментарии

Super Admin может создавать **internal comments** (внутренние комментарии), которые не видны tenant админам. Это полезно для:
- Заметок для себя
- Обсуждения с другими супер-админами
- Технической информации

Для создания внутреннего комментария:
```json
{
  "content": "Заметка: требуется обновить настройки LDAP на сервере",
  "isInternal": true
}
```

## База данных

### Таблица support_tickets

```sql
CREATE TABLE support_tickets (
  id VARCHAR PRIMARY KEY,
  number SERIAL,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR NOT NULL, -- OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED
  priority VARCHAR NOT NULL, -- LOW, MEDIUM, HIGH, URGENT
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  creator_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL
);
```

### Таблица support_comments

```sql
CREATE TABLE support_comments (
  id VARCHAR PRIMARY KEY,
  content TEXT NOT NULL,
  ticket_id VARCHAR NOT NULL REFERENCES support_tickets(id),
  author_id VARCHAR NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Права доступа

### Super Admin (ADMIN без tenantId)
- ✅ Видит все support-тикеты всех организаций
- ✅ Может отвечать на любые тикеты
- ✅ Может изменять статус и приоритет
- ✅ Может создавать внутренние комментарии
- ✅ НЕ видит обычных пользователей и агентов

### Tenant Admin (TENANT_ADMIN)
- ✅ Видит только свои support-тикеты
- ✅ Может создавать новые тикеты
- ✅ Может отвечать на свои тикеты
- ✅ Может изменять статус своих тикетов
- ❌ НЕ видит внутренние комментарии
- ❌ НЕ видит тикеты других организаций

### Agent и User
- ❌ НЕ имеют доступа к support-тикетам

## Примеры использования

### Пример 1: Запрос на активацию модуля

**Tenant Admin создаёт тикет:**
```
Тема: Активация модуля LDAP
Описание: Здравствуйте! Мы хотим подключить корпоративный Active Directory.
Можете ли активировать модуль LDAP для нашей организации?
Приоритет: HIGH
```

**Super Admin отвечает:**
```
Добрый день! Модуль LDAP активирован для вашей организации.
Вы можете настроить его в разделе "LDAP" → "Настройки".
Если возникнут вопросы, обращайтесь!

Статус: RESOLVED
```

### Пример 2: Вопрос по тарифам

**Tenant Admin:**
```
Тема: Вопрос по тарифу PRO
Описание: Сколько пользователей можно добавить на тарифе PRO?
Есть ли скидки для годовой оплаты?
```

**Super Admin:**
```
На тарифе PRO доступно до 50 пользователей и 15 агентов.
При годовой оплате предоставляется скидка 20%.
Подробности на странице "Тарифы и оплата".
```

### Пример 3: Техническая проблема

**Tenant Admin:**
```
Тема: Не работает интеграция с Telegram
Описание: Настроили Telegram бота, но уведомления не приходят.
Токен: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
Приоритет: URGENT
```

**Super Admin (internal comment):**
```
[INTERNAL] Проверил - webhook не настроен.
Нужно обновить настройки бота.
```

**Super Admin (public comment):**
```
Проблема найдена. Обновил настройки вашего бота.
Попробуйте отправить тестовое сообщение.
```

## Интеграция с уведомлениями

В будущих версиях планируется:
- ✅ Email уведомления о новых тикетах
- ✅ Email уведомления о новых комментариях
- ✅ Push уведомления в браузере
- ✅ Telegram уведомления для супер-админов
- ✅ Slack интеграция для команды поддержки

## Метрики и отчёты

Доступные метрики для супер-админа:
- Общее количество тикетов
- Открытые тикеты
- Среднее время ответа
- Среднее время решения
- Топ организаций по количеству тикетов
- Распределение по приоритетам

## Best Practices

### Для Tenant Admin:
1. Четко описывайте проблему
2. Указывайте версию браузера и ОС
3. Прикладывайте скриншоты (если возможно)
4. Используйте правильный приоритет
5. Отвечайте на вопросы супер-админа

### Для Super Admin:
1. Отвечайте в течение 24 часов
2. Будьте вежливы и профессиональны
3. Предоставляйте чёткие инструкции
4. Используйте internal comments для заметок
5. Закрывайте решённые тикеты
6. Собирайте feedback

## Troubleshooting

### Tenant Admin не видит кнопку "Создать обращение"
**Решение:** Убедитесь что:
- Роль пользователя: TENANT_ADMIN
- Пользователь привязан к организации (tenantId не null)

### Super Admin не видит тикеты
**Решение:**
- Роль должна быть ADMIN
- tenantId должен быть NULL
- Проверьте в /api/support-tickets

### Ошибка 403 при создании тикета
**Решение:**
- Только TENANT_ADMIN может создавать support-тикеты
- Обычные AGENT и USER не имеют доступа

---

**Создано:** 2025-01-28  
**Версия:** 1.0.0  
**Статус:** ✅ Ready

