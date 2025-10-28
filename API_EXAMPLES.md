# 📡 API Examples - ServiceDesk

> Примеры использования API endpoints для разработчиков

---

## 🔐 Аутентификация

Все запросы требуют аутентификации через NextAuth session cookie.

```typescript
// В браузере cookie устанавливается автоматически после логина
// Для внешних клиентов используйте session token
```

---

## 🎫 Tickets API

### Получить список тикетов

```bash
GET /api/tickets
```

**Query параметры:**
- `status` - Фильтр по статусу (OPEN, IN_PROGRESS, RESOLVED, etc.)
- `priority` - Фильтр по приоритету (LOW, MEDIUM, HIGH, URGENT)
- `categoryId` - Фильтр по категории
- `queueId` - Фильтр по очереди

**Response:**
```json
[
  {
    "id": "cm123...",
    "number": 42,
    "title": "Не работает принтер",
    "description": "Принтер HP на 3 этаже не печатает",
    "status": "OPEN",
    "priority": "HIGH",
    "creator": {
      "id": "user123",
      "name": "Иван Иванов",
      "email": "ivan@example.com"
    },
    "assignee": {
      "id": "agent456",
      "name": "Петр Агентов"
    },
    "category": {
      "id": "cat1",
      "name": "Оборудование",
      "color": "#ef4444"
    },
    "tenant": {
      "slug": "acme-corp"
    },
    "slaDueDate": "2025-10-27T10:00:00Z",
    "slaBreached": false,
    "_count": {
      "comments": 3
    },
    "createdAt": "2025-10-26T09:00:00Z"
  }
]
```

### Создать тикет

```bash
POST /api/tickets
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Не работает интернет",
  "description": "В офисе пропал интернет на всех компьютерах",
  "priority": "URGENT",
  "categoryId": "cm123...",
  "queueId": "cm456...",
  "customFields": {
    "location": "Офис, 2 этаж",
    "affected_users": "15"
  }
}
```

**Response:**
```json
{
  "id": "cm789...",
  "number": 43,
  "title": "Не работает интернет",
  "status": "OPEN",
  "createdAt": "2025-10-26T09:30:00Z"
}
```

### Обновить тикет

```bash
PATCH /api/tickets/cm789...
Content-Type: application/json
```

**Body:**
```json
{
  "status": "IN_PROGRESS",
  "assigneeId": "agent456",
  "priority": "HIGH"
}
```

### Добавить комментарий

```bash
POST /api/tickets/cm789.../comments
Content-Type: application/json
```

**Body:**
```json
{
  "content": "Проверил роутер, перезагрузил. Интернет восстановлен.",
  "isInternal": false
}
```

---

## 📥 Queues API

### Получить очереди

```bash
GET /api/queues
```

**Response:**
```json
[
  {
    "id": "queue1",
    "name": "IT Support",
    "description": "Общая поддержка IT",
    "color": "#3b82f6",
    "icon": "💻",
    "priority": 1,
    "isActive": true,
    "_count": {
      "tickets": 15
    }
  }
]
```

### Создать очередь

```bash
POST /api/queues
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Security",
  "description": "Вопросы безопасности",
  "color": "#ef4444",
  "icon": "🔒",
  "priority": 0,
  "isActive": true
}
```

---

## ⏱️ SLA Policies API

### Получить SLA политики

```bash
GET /api/sla-policies
```

**Response:**
```json
[
  {
    "id": "sla1",
    "name": "Standard Support",
    "responseTime": 60,
    "resolutionTime": 240,
    "priorities": ["MEDIUM", "LOW"],
    "businessHoursOnly": true,
    "businessHoursStart": "09:00",
    "businessHoursEnd": "18:00",
    "businessDays": [1, 2, 3, 4, 5],
    "isActive": true
  }
]
```

### Создать SLA политику

```bash
POST /api/sla-policies
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Priority Support",
  "description": "Для приоритетных клиентов",
  "responseTime": 15,
  "resolutionTime": 60,
  "priorities": ["URGENT", "HIGH"],
  "categoryIds": ["cat1", "cat2"],
  "businessHoursOnly": false,
  "isActive": true
}
```

---

## 📝 Custom Fields API

### Получить кастомные поля

```bash
GET /api/custom-fields?active=true
```

**Response:**
```json
[
  {
    "id": "field1",
    "name": "location",
    "label": "Локация",
    "type": "TEXT",
    "isRequired": true,
    "isActive": true,
    "order": 1
  },
  {
    "id": "field2",
    "name": "department",
    "label": "Отдел",
    "type": "SELECT",
    "options": ["IT", "HR", "Finance", "Sales"],
    "isRequired": false,
    "isActive": true,
    "order": 2
  }
]
```

### Создать кастомное поле

```bash
POST /api/custom-fields
Content-Type: application/json
```

**Body:**
```json
{
  "name": "affected_systems",
  "label": "Затронутые системы",
  "description": "Какие системы не работают",
  "type": "MULTI_SELECT",
  "options": ["Email", "CRM", "ERP", "Website"],
  "isRequired": false,
  "isActive": true,
  "order": 3
}
```

---

## 🔔 Notifications API

### Получить уведомления

```bash
GET /api/notifications?grouped=true&unreadOnly=true
```

**Response:**
```json
[
  {
    "id": "notif1",
    "type": "TICKET_ASSIGNED",
    "resourceType": "ticket",
    "resourceId": "cm789...",
    "count": 1,
    "isRead": false,
    "firstEventAt": "2025-10-26T09:00:00Z",
    "lastEventAt": "2025-10-26T09:00:00Z",
    "_count": {
      "notifications": 1
    }
  }
]
```

### Отметить как прочитанное

```bash
POST /api/notifications
Content-Type: application/json
```

**Body:**
```json
{
  "action": "mark_read",
  "groupId": "notif1"
}
```

---

## 📚 Knowledge Base API

### Получить статьи

```bash
GET /api/knowledge?status=PUBLISHED&search=принтер
```

**Response:**
```json
[
  {
    "id": "article1",
    "title": "Как подключить принтер",
    "slug": "how-to-connect-printer",
    "excerpt": "Пошаговая инструкция по подключению принтера к компьютеру",
    "status": "PUBLISHED",
    "isPublic": true,
    "views": 125,
    "tags": ["принтер", "оборудование", "инструкция"],
    "publishedAt": "2025-10-20T00:00:00Z"
  }
]
```

### Создать статью

```bash
POST /api/knowledge
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Сброс пароля в Active Directory",
  "slug": "reset-ad-password",
  "content": "# Как сбросить пароль\n\n1. Открыть консоль...",
  "excerpt": "Инструкция для администраторов",
  "status": "DRAFT",
  "tags": ["active directory", "пароли", "администрирование"],
  "isPublic": false
}
```

---

## 📊 Dashboard Stats API

### Получить статистику

```bash
GET /api/dashboard/stats?period=30d
```

**Response:**
```json
{
  "summary": {
    "total": 156,
    "open": 23,
    "resolved": 98,
    "inProgress": 35
  },
  "timeline": {
    "created": [
      { "date": "2025-10-01", "count": 5 },
      { "date": "2025-10-02", "count": 8 }
    ],
    "resolved": [
      { "date": "2025-10-01", "count": 4 },
      { "date": "2025-10-02", "count": 6 }
    ]
  },
  "byPriority": [
    { "priority": "LOW", "count": 45 },
    { "priority": "MEDIUM", "count": 67 },
    { "priority": "HIGH", "count": 32 },
    { "priority": "URGENT", "count": 12 }
  ],
  "byCategory": [
    { "id": "cat1", "name": "Оборудование", "count": 56 },
    { "id": "cat2", "name": "Программное обеспечение", "count": 78 }
  ],
  "byQueue": [
    { "id": "queue1", "name": "IT Support", "count": 89 },
    { "id": "queue2", "name": "Network", "count": 67 }
  ]
}
```

---

## 🚩 Feature Flags API

### Получить модули tenant

```bash
GET /api/tenants/cm123.../modules
```

**Response:**
```json
{
  "id": "cm123...",
  "name": "ACME Corp",
  "settings": {
    "ticketPrefix": "ACME",
    "modules": {
      "queues": true,
      "sla": false,
      "knowledge": false,
      "automation": false,
      "assets": false,
      "reports": true,
      "webhooks": false,
      "ldap": false,
      "customFields": false,
      "savedFilters": false
    }
  }
}
```

### Обновить модули

```bash
PATCH /api/tenants/cm123.../modules
Content-Type: application/json
```

**Body:**
```json
{
  "modules": {
    "sla": true,
    "knowledge": true
  }
}
```

---

## 🔍 Saved Filters API

### Получить фильтры

```bash
GET /api/filters
```

**Response:**
```json
[
  {
    "id": "filter1",
    "name": "Мои открытые тикеты",
    "icon": "📋",
    "color": "#3b82f6",
    "isDefault": true,
    "isPublic": false,
    "filters": {
      "status": ["OPEN", "IN_PROGRESS"],
      "assigneeId": "current_user"
    }
  }
]
```

### Создать фильтр

```bash
POST /api/filters
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Срочные тикеты",
  "description": "Все срочные тикеты",
  "icon": "🔥",
  "color": "#ef4444",
  "isDefault": false,
  "isPublic": true,
  "filters": {
    "priority": ["URGENT"],
    "status": ["OPEN", "IN_PROGRESS"]
  }
}
```

---

## 🧑‍💼 Agents API

### Получить агентов

```bash
GET /api/agents
```

**Response:**
```json
[
  {
    "id": "agent1",
    "name": "Петр Агентов",
    "email": "agent@example.com",
    "agentStatus": "AVAILABLE",
    "permissions": {
      "ticket.delete": true,
      "user.view": true,
      "category.create": true
    },
    "_count": {
      "assignedTickets": 12,
      "categoryAssignments": 3
    }
  }
]
```

### Обновить статус агента

```bash
PATCH /api/agents/agent1
Content-Type: application/json
```

**Body:**
```json
{
  "agentStatus": "ON_LEAVE"
}
```

### Назначить права агенту

```bash
POST /api/users/agent1/permissions
Content-Type: application/json
```

**Body:**
```json
{
  "permissions": {
    "ticket.delete": true,
    "user.view": true,
    "user.reset_password": true,
    "category.create": true
  }
}
```

---

## ❌ Обработка ошибок

Все API endpoints возвращают стандартные HTTP коды:

| Код | Значение |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Ошибка валидации |
| 401 | Не авторизован |
| 403 | Нет прав доступа |
| 404 | Ресурс не найден |
| 500 | Внутренняя ошибка сервера |

**Пример ответа с ошибкой:**
```json
{
  "error": "Validation error",
  "message": "Title is required",
  "issues": [
    {
      "code": "invalid_type",
      "path": ["title"],
      "message": "Required"
    }
  ]
}
```

---

## 🔒 Rate Limiting

В production рекомендуется настроить rate limiting:

- **Authenticated users:** 1000 req/hour
- **Per IP:** 100 req/hour

---

## 📝 Заметки

1. Все даты возвращаются в формате ISO 8601 (UTC)
2. Pagination доступна через query параметры `page` и `limit`
3. Для полей `tenantId` используется текущий tenant из сессии
4. Все мутирующие операции логируются в Audit Log

---

**Готово для интеграции! 🚀**

