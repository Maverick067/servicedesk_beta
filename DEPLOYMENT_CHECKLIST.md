# ✅ Production Deployment Checklist для OnPoints.it

## 📋 Перед деплоем

### 1. Инфраструктура
- [ ] Сервер с минимальными требованиями:
  - [ ] 2+ vCPU (4+ рекомендуется)
  - [ ] 4+ GB RAM (8+ рекомендуется)
  - [ ] 20+ GB SSD (50+ GB для production)
  - [ ] Ubuntu 22.04 LTS или Debian 12+
- [ ] Docker и Docker Compose установлены
- [ ] Firewall настроен (порты 80, 443, 22)
- [ ] SSL сертификаты готовы (Let's Encrypt)

### 2. База данных
- [ ] PostgreSQL 16+ установлен или Managed DB настроена
- [ ] Backup стратегия настроена (cron job)
- [ ] Connection pooling настроен (PgBouncer)
- [ ] RLS policies применены (автоматически через миграции)

### 3. Переменные окружения (.env)
- [ ] `DATABASE_URL` - подключение к PostgreSQL
- [ ] `NEXTAUTH_SECRET` - минимум 32 символа, криптографически безопасный
- [ ] `NEXTAUTH_URL` - production URL (https://onpoints.it)
- [ ] `STRIPE_SECRET_KEY` - live key от Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` - webhook secret от Stripe
- [ ] `SENTRY_DSN` - для error tracking
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (если SSO нужен)
- [ ] `AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` (если SSO нужен)

### 4. Stripe Billing Setup
- [ ] Stripe аккаунт активирован в production mode
- [ ] Webhook URL настроен: `https://onpoints.it/api/webhooks/stripe`
- [ ] Webhook events подписаны:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Pricing plans созданы в Stripe Dashboard
- [ ] Test mode протестирован

### 5. SSO/OIDC Setup (опционально)
- [ ] Google OAuth приложение создано (production)
- [ ] Azure AD приложение зарегистрировано
- [ ] Redirect URIs обновлены для production
- [ ] Tenant admins могут настраивать SSO в UI

### 6. Мониторинг и логи
- [ ] Prometheus metrics endpoint доступен
- [ ] Grafana dashboard импортирован
- [ ] Sentry project создан и DSN добавлен
- [ ] Alerting настроен (email/Slack)

---

## 🚀 Деплой

### Шаг 1: Подготовка сервера
```bash
# Подключитесь к серверу
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

### Шаг 2: Клонирование и настройка
```bash
# Клонируйте репозиторий
git clone https://github.com/YOUR_ORG/servicedesk.git
cd servicedesk

# Скопируйте и настройте .env
cp .env.example .env
nano .env  # Заполните все переменные

# Проверьте конфигурацию
cat .env | grep -v '^#' | grep .
```

### Шаг 3: Запуск
```bash
# Запустите все сервисы
docker-compose --profile production up -d

# Проверьте статус
docker-compose ps

# Примените миграции
docker-compose exec app bunx prisma migrate deploy

# Проверьте health check
curl http://localhost:3000/api/health
```

### Шаг 4: Настройка Nginx
```bash
# SSL сертификаты для main domain
sudo certbot certonly --standalone -d onpoints.it -d www.onpoints.it

# Wildcard сертификат для subdomains
sudo certbot certonly --dns-cloudflare -d "*.onpoints.it"

# Перезапустите Nginx
docker-compose restart nginx

# Проверьте конфигурацию
docker-compose exec nginx nginx -t
```

### Шаг 5: Проверка
```bash
# Проверьте HTTPS
curl -I https://onpoints.it

# Проверьте metrics
curl https://onpoints.it/api/metrics

# Проверьте логи
docker-compose logs -f app
```

---

## 🔒 Безопасность

### Post-deployment
- [ ] Firewall настроен (ufw или iptables)
  ```bash
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw enable
  ```
- [ ] SSH доступ только по ключу (отключить пароли)
- [ ] Fail2ban установлен для защиты от brute-force
- [ ] Регулярные обновления настроены (unattended-upgrades)
- [ ] Database credentials ротируются каждые 90 дней
- [ ] Audit logs включены и мониторятся

### Rate Limiting
- [ ] Nginx rate limiting настроен
- [ ] API rate limits применены (встроенные в Next.js middleware)
- [ ] DDoS protection через Cloudflare (опционально)

---

## 📊 Мониторинг

### Prometheus + Grafana
- [ ] Prometheus scraping работает: `http://your-server:9090`
- [ ] Grafana dashboard импортирован: `http://your-server:3001`
- [ ] Alerts настроены:
  - [ ] High CPU usage (> 80%)
  - [ ] High memory usage (> 90%)
  - [ ] Database connection errors
  - [ ] HTTP 5xx errors (> 10/min)
  - [ ] Disk space (< 10% free)

### Sentry
- [ ] Errors отслеживаются в Sentry Dashboard
- [ ] Email alerts настроены для critical errors
- [ ] Source maps загружены для production

### Логи
- [ ] Centralized logging настроен (опционально: ELK, Loki)
- [ ] Log rotation настроен (logrotate)
- [ ] Retention policy: 30 дней

---

## 💾 Backup

### Автоматический backup
- [ ] Cron job настроен:
  ```bash
  crontab -e
  # Добавьте:
  0 2 * * * /path/to/servicedesk/scripts/backup-postgres.sh
  ```
- [ ] Backup файлы хранятся в отдельном месте (S3, external storage)
- [ ] Retention policy: 30 дней локально, 90 дней в S3
- [ ] Backup тестирован (restore проверен)

### Disaster Recovery
- [ ] DR план документирован
- [ ] RTO (Recovery Time Objective): < 4 часа
- [ ] RPO (Recovery Point Objective): < 24 часа
- [ ] Restore процедура протестирована

---

## 🔄 CI/CD

### GitHub Actions
- [ ] Secrets добавлены в GitHub:
  - [ ] `DOCKER_USERNAME`
  - [ ] `DOCKER_PASSWORD`
  - [ ] `PROD_HOST`
  - [ ] `PROD_USER`
  - [ ] `PROD_SSH_KEY`
  - [ ] `PROD_URL`
- [ ] Pipeline работает:
  - [ ] Lint и TypeScript проверка
  - [ ] Build Docker образа
  - [ ] Push в Docker Registry
  - [ ] Deploy на production сервер
  - [ ] Health check после deploy
- [ ] Rollback стратегия протестирована

---

## 🧪 Post-Deploy Testing

### Функциональные тесты
- [ ] Логин/регистрация работает
- [ ] Создание tenant работает
- [ ] Создание тикета работает
- [ ] Комментарии работают
- [ ] Уведомления приходят
- [ ] Billing checkout работает
- [ ] SSO логин работает (если настроен)
- [ ] Telegram bot отвечает (если настроен)

### Performance тесты
- [ ] Page load time < 2s (Google PageSpeed)
- [ ] API response time < 300ms (среднее)
- [ ] Database query time < 100ms (среднее)
- [ ] No memory leaks (мониторинг 24 часа)

### Security тесты
- [ ] HTTPS работает корректно (A+ на SSL Labs)
- [ ] Security headers настроены (securityheaders.com)
- [ ] XSS protection работает
- [ ] CSRF protection работает
- [ ] Rate limiting срабатывает
- [ ] RLS изоляция работает (tenants не видят данные друг друга)

---

## 📞 Support & Maintenance

### Документация
- [ ] README.md обновлен
- [ ] TESTING.md создан
- [ ] API документация доступна
- [ ] Runbook для операторов создан

### Contacts
- [ ] On-call rotation настроена
- [ ] Incident management процесс определен
- [ ] Status page настроена (опционально: statuspage.io)
- [ ] Customer support email настроен

### Регулярные задачи
- [ ] Еженедельная проверка metrics
- [ ] Ежемесячная проверка backup
- [ ] Квартальное обновление зависимостей
- [ ] Ежегодный security audit

---

## 🎯 Production Launch

### T-1 день
- [ ] Все чекпоинты выше пройдены
- [ ] Staging environment протестирован полностью
- [ ] Load testing выполнен
- [ ] Команда готова к launch

### Launch день
- [ ] Deploy в production выполнен
- [ ] DNS обновлен (TTL снижен заранее)
- [ ] Мониторинг активен
- [ ] Team на связи

### T+1 день
- [ ] Логи проверены на ошибки
- [ ] Metrics в пределах нормы
- [ ] Customer feedback собран
- [ ] Post-mortem (если были проблемы)

---

## 🚨 Rollback Plan

Если что-то пошло не так:

```bash
# 1. Откатитесь к предыдущей версии Docker образа
docker-compose down
git checkout previous-stable-tag
docker-compose --profile production up -d

# 2. Восстановите базу из backup (если нужно)
bash scripts/restore-postgres.sh backups/last-good-backup.sql.gz

# 3. Проверьте health check
curl https://onpoints.it/api/health

# 4. Уведомите пользователей (status page)
```

---

## ✅ Final Checklist

Перед тем как объявить "Production Ready":

- [ ] **Все пункты выше завершены**
- [ ] **Staging протестирован полностью**
- [ ] **Load testing пройден**
- [ ] **Security audit выполнен**
- [ ] **Backup & DR протестированы**
- [ ] **Monitoring alerts настроены**
- [ ] **Team обучена и готова**
- [ ] **Документация актуальна**

---

**🎉 Поздравляем! Ваша платформа OnPoints.it готова к Production!**

Не забудьте отпраздновать успешный запуск с командой! 🍾

