# ⚡ Быстрый старт - ServiceDesk

> Запустите систему за 5 минут!

---

## 🚀 Шаг 1: Установка (2 мин)

```bash
# Перейти в директорию проекта
cd C:\ServiceDesk

# Установить зависимости (если еще не установлены)
bun install
```

---

## 🗄️ Шаг 2: База данных (1 мин)

```bash
# Применить схему к PostgreSQL
bun run prisma db push

# ✅ Готово! БД создана с 24 таблицами
```

**Примечание:** Убедитесь, что PostgreSQL запущен и доступен

---

## ▶️ Шаг 3: Запуск (30 сек)

```bash
# Запустить dev сервер
bun run dev

# Или с переменными окружения (если нужно):
cd c:\ServiceDesk
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/servicedesk?schema=public"
$env:NEXTAUTH_SECRET="supersecretkey12345678901234567890123"
$env:NEXTAUTH_URL="http://localhost:3000"
bun run dev
```

**Приложение запустится:** http://localhost:3000

---

## 👤 Шаг 4: Первый вход (1 мин)

### Вариант A: Создать организацию через UI

1. Откройте http://localhost:3000
2. Нажмите "Создать организацию"
3. Заполните форму:
   - **Название:** ACME Corp
   - **Slug:** acme-corp
   - **Email admin:** admin@acme-corp.com
   - **Пароль:** admin123
4. Войдите с этими данными

### Вариант B: Использовать существующие данные

Если уже есть пользователи в БД:
- Email: `admin@example.com`
- Пароль: `admin123`

---

## 🎯 Шаг 5: Что делать дальше? (30 сек)

После входа вы увидите дашборд. Попробуйте:

### 1. Создать тикет
`/dashboard/tickets` → **"Создать тикет"**

### 2. Включить модули
`/dashboard/settings` → **"Модули"** → Включите `SLA`, `Knowledge`, `Queues`

### 3. Добавить категорию
`/dashboard/categories` → **"Создать категорию"**

### 4. Создать агента
`/dashboard/agents` → **"Добавить агента"**

### 5. Настроить SLA
`/dashboard/sla` → **"Создать SLA Политику"**

---

## 🛠️ Полезные команды

```bash
# Prisma Studio (GUI для БД)
bun run prisma studio
# Откроется: http://localhost:5555

# Перегенерировать Prisma Client (если изменили схему)
bun run prisma generate

# Проверить линтинг
bun run lint

# Production build
bun run build
bun run start
```

---

## 📍 Основные URL

| Страница | URL |
|----------|-----|
| **Дашборд** | http://localhost:3000/dashboard |
| **Тикеты** | http://localhost:3000/dashboard/tickets |
| **Создать тикет** | http://localhost:3000/dashboard/tickets/new |
| **Очереди** | http://localhost:3000/dashboard/queues |
| **SLA** | http://localhost:3000/dashboard/sla |
| **База знаний** | http://localhost:3000/dashboard/knowledge |
| **Агенты** | http://localhost:3000/dashboard/agents |
| **Настройки** | http://localhost:3000/dashboard/settings |

---

## 🔧 Если что-то не работает

### Проблема 1: Сервер не запускается

```bash
# Убить старые процессы
taskkill /F /IM node.exe
taskkill /F /IM bun.exe

# Удалить кеш
Remove-Item -Recurse -Force .next

# Запустить снова
bun run dev
```

### Проблема 2: База данных не подключается

Проверьте:
1. PostgreSQL запущен
2. `DATABASE_URL` в `.env` правильный
3. База данных `servicedesk` существует

```bash
# Создать БД (если нужно)
psql -U postgres -c "CREATE DATABASE servicedesk;"
```

### Проблема 3: Prisma Client устарел

```bash
# Регенерировать
bun run prisma generate

# Перезапустить сервер
```

---

## 📚 Дополнительная информация

- **README.md** - Полное руководство
- **MODULES_STATUS.md** - Статус всех модулей
- **API_EXAMPLES.md** - Примеры API запросов
- **SERVER_STATUS.md** - Текущий статус
- **IMPLEMENTATION_SUMMARY.md** - Итоговый отчет

---

## 🎉 Готово!

**Система запущена и готова к работе!**

Основные возможности:
- ✅ Создание тикетов
- ✅ Назначение агентам
- ✅ Комментарии
- ✅ SLA отслеживание
- ✅ Очереди
- ✅ База знаний
- ✅ Аналитика

**Приятной работы! 🚀**

---

### 💡 Совет

Включите модули через `/dashboard/settings` для доступа ко всем возможностям!

- **Queues** - Группировка тикетов
- **SLA** - Контроль времени
- **Knowledge** - База знаний
- **Custom Fields** - Дополнительные поля
- **Saved Filters** - Быстрые фильтры

---

*Если нужна помощь - см. документацию или задайте вопрос!*

