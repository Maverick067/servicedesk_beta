# 🚀 Быстрый старт ServiceDesk

## 📋 Что нужно перед началом

1. **PostgreSQL** - База данных должна быть установлена и запущена
2. **Bun** - Package manager (или Node.js 18+)

## ⚡ Быстрая установка (3 команды)

### 1. Установите зависимости
```bash
bun install
```

### 2. Настройте базу данных
```bash
# Создайте базу данных в PostgreSQL
createdb servicedesk

# Или через psql:
psql -U postgres
CREATE DATABASE servicedesk;
\q
```

Отредактируйте `.env` файл с вашими данными PostgreSQL:
```env
DATABASE_URL="postgresql://ВАШ_ПОЛЬЗОВАТЕЛЬ:ВАШ_ПАРОЛЬ@localhost:5432/servicedesk?schema=public"
```

### 3. Инициализируйте базу данных и запустите
```bash
# Применить схему БД
bun run db:push

# Заполнить демо данными
bunx prisma db seed

# Запустить проект
bun run dev
```

Готово! Откройте http://localhost:3000 🎉

## 👤 Войти в систему

После seed вы можете войти с этими учетными данными:

### 👑 Администратор (полный доступ)
- Email: `admin@demo.com`
- Пароль: `admin123`

### 👨‍💼 Агент (управление тикетами)
- Email: `agent@demo.com`
- Пароль: `agent123`

### 👤 Пользователь (создание тикетов)
- Email: `user@demo.com`
- Пароль: `user123`

## 🔧 Полезные команды

```bash
# Открыть Prisma Studio (GUI для БД)
bun run db:studio

# Пересоздать БД (ОСТОРОЖНО: удалит все данные!)
bunx prisma migrate reset

# Сгенерировать новый NEXTAUTH_SECRET
openssl rand -base64 32
```

## ❓ Частые проблемы

### Ошибка подключения к базе данных
- Проверьте, что PostgreSQL запущен
- Проверьте данные в `.env` файле
- Проверьте, что база данных `servicedesk` создана

### Ошибка "Prisma Client not generated"
```bash
bun run db:generate
```

### Порт 3000 занят
Запустите на другом порту:
```bash
PORT=3001 bun run dev
```

## 📁 Структура файлов

```
ServiceDesk/
├── src/
│   ├── app/              # Next.js страницы
│   │   ├── api/          # API endpoints
│   │   ├── dashboard/    # Дашборд
│   │   └── login/        # Страница входа
│   ├── components/       # React компоненты
│   └── lib/              # Утилиты и конфиги
├── prisma/
│   ├── schema.prisma     # Схема БД
│   └── seed.ts           # Демо данные
└── .env                  # Переменные окружения
```

## 🎯 Что дальше?

1. Войдите как разные пользователи и изучите функционал
2. Создайте тикет от имени пользователя
3. Назначьте его агенту
4. Измените статус и добавьте комментарии
5. Посмотрите на разницу в правах доступа

Приятной работы! 🚀

