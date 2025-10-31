# 🐧 Деплой на Linux сервер

## ✅ Рекомендация: Linux (Ubuntu/Debian)

**Почему Linux:**
- ✅ Лучшая производительность для Node.js/Next.js
- ✅ Проще настройка PostgreSQL и зависимостей
- ✅ Дешевле в облачных провайдерах
- ✅ Лучшая поддержка Docker и контейнеризации
- ✅ Больше документации и примеров

---

## 🚀 Быстрый старт

### Шаг 1: Подготовка сервера

```bash
# Подключитесь к серверу (Ubuntu 22.04 или Debian 12+)
ssh root@your-server-ip

# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com | sh

# Установите Docker Compose
apt install docker-compose-plugin -y

# Создайте пользователя для приложения
adduser servicedesk
usermod -aG docker servicedesk
su - servicedesk
```

### Шаг 2: Клонирование проекта

```bash
# Клонируйте репозиторий
git clone https://github.com/Maverick067/Servicedesk-v1.git
cd Servicedesk-v1

# Скопируйте .env файл (если есть .env.example)
cp .env.example .env 2>/dev/null || touch .env

# Настройте переменные окружения
nano .env
```

### Шаг 3: Настройка .env

Минимальные переменные:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/servicedesk?schema=public

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars

# Stripe (опционально)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Sentry (опционально)
SENTRY_DSN=https://...

# Node Environment
NODE_ENV=production
```

**Важно:** Сгенерируйте безопасный `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Шаг 4: Запуск через Docker Compose

```bash
# Запустите все сервисы
docker-compose up -d

# Проверьте статус
docker-compose ps

# Примените миграции базы данных
docker-compose exec app bunx prisma migrate deploy

# Примените RLS policies (если нужно)
docker-compose exec app bunx prisma db execute --file prisma/migrations/enable_rls.sql

# Проверьте логи
docker-compose logs -f app
```

### Шаг 5: Настройка Nginx (обратный прокси)

```bash
# Установите Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Создайте конфигурацию
sudo nano /etc/nginx/sites-available/servicedesk
```

Добавьте конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/servicedesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Проверьте автоматическое обновление
sudo certbot renew --dry-run
```

### Шаг 6: Настройка Firewall

```bash
# Разрешите необходимые порты
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Проверьте статус
sudo ufw status
```

---

## 🔧 Обслуживание

### Обновление приложения

```bash
cd /path/to/Servicedesk-v1
git pull
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec app bunx prisma migrate deploy
```

### Резервное копирование базы данных

```bash
# Ручной backup
docker-compose exec postgres pg_dump -U postgres servicedesk > backup-$(date +%Y%m%d).sql

# Автоматический backup (cron)
crontab -e
# Добавьте:
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres servicedesk | gzip > /backups/servicedesk-$(date +\%Y\%m\%d).sql.gz
```

### Мониторинг

```bash
# Проверка статуса контейнеров
docker-compose ps

# Просмотр логов
docker-compose logs -f app
docker-compose logs -f postgres

# Использование ресурсов
docker stats

# Health check
curl http://localhost:3000/api/health
```

---

## 🐛 Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
docker-compose logs app

# Проверьте переменные окружения
docker-compose exec app env | grep -E "DATABASE_URL|NEXTAUTH"

# Проверьте подключение к БД
docker-compose exec app bunx prisma db pull
```

### Проблемы с миграциями

```bash
# Сбросьте и примените миграции (ОСТОРОЖНО - удалит данные!)
docker-compose exec app bunx prisma migrate reset

# Или примените миграции без сброса
docker-compose exec app bunx prisma migrate deploy
```

### Проблемы с RLS

```bash
# Проверьте RLS статус
docker-compose exec postgres psql -U postgres -d servicedesk -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"

# Примените RLS policies
docker-compose exec app bun run scripts/apply-rls.ts
```

---

## 📊 Рекомендуемые требования сервера

### Минимальные (для тестирования):
- **CPU:** 2 vCPU
- **RAM:** 4 GB
- **Диск:** 20 GB SSD

### Рекомендуемые (для production):
- **CPU:** 4+ vCPU
- **RAM:** 8+ GB
- **Диск:** 50+ GB SSD
- **OS:** Ubuntu 22.04 LTS или Debian 12+

---

## 🔗 Полезные команды

```bash
# Перезапуск всех сервисов
docker-compose restart

# Остановка всех сервисов
docker-compose down

# Остановка с удалением volumes (ОСТОРОЖНО!)
docker-compose down -v

# Обновление контейнеров
docker-compose pull
docker-compose up -d

# Просмотр использования диска
docker system df

# Очистка неиспользуемых данных
docker system prune -a
```

---

## ✅ Чеклист перед запуском

- [ ] Сервер настроен (Docker установлен)
- [ ] .env файл заполнен правильно
- [ ] База данных создана и доступна
- [ ] Миграции применены
- [ ] RLS policies применены
- [ ] Nginx настроен и работает
- [ ] SSL сертификаты установлены
- [ ] Firewall настроен
- [ ] Health check проходит: `curl https://your-domain.com/api/health`
- [ ] Логи не показывают ошибок

---

## 🎯 Что дальше?

После успешного деплоя:
1. Проверьте работу всех функций
2. Настройте мониторинг (Prometheus/Grafana)
3. Настройте автоматические бэкапы
4. Настройте CI/CD для автоматического деплоя
5. Документируйте процесс для команды

---

**Удачи с деплоем! 🚀**

