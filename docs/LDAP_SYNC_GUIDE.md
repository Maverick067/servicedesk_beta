# 🔄 Автоматическая синхронизация Active Directory

## Обзор

Система поддерживает автоматическую синхронизацию пользователей из Active Directory. Это позволяет:
- ✅ Автоматически добавлять новых сотрудников
- ✅ Обновлять имена существующих пользователей
- ✅ Исключать компьютеры и системные аккаунты
- ✅ Исключать отключенные учетные записи

## Настройка через UI

### Шаг 1: Включите автосинхронизацию

1. Перейдите в **LDAP / Active Directory**
2. Найдите вашу конфигурацию
3. Нажмите на **иконку шестеренки ⚙️**
4. Включите **"Автоматическая синхронизация"**
5. Выберите интервал:
   - Каждые 15 минут
   - Каждые 30 минут
   - **Каждый час** (рекомендуется)
   - Каждые 2 часа
   - Каждые 4 часа
   - Каждые 8 часов
   - Каждый день

### Шаг 2: Настройте cron job

Автоматическая синхронизация требует настройки cron job на сервере.

#### Для Linux/Unix:

```bash
# Откройте crontab
crontab -e

# Добавьте строку (каждый час):
0 * * * * /path/to/scripts/ldap-sync-cron.sh >> /var/log/ldap-sync.log 2>&1

# Или напрямую через curl:
0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourapp.com/api/cron/ldap-sync
```

#### Для Windows (Task Scheduler):

1. Откройте **Task Scheduler** (Планировщик заданий)
2. Создайте **новую задачу**
3. **Триггер**: Повторять каждый час
4. **Действие**: Запустить программу
   - Программа: `C:\ServiceDesk\scripts\ldap-sync-cron.bat`
5. Сохраните задачу

Или через PowerShell:

```powershell
# Создать задачу
$action = New-ScheduledTaskAction -Execute "C:\ServiceDesk\scripts\ldap-sync-cron.bat"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "LDAP Sync" -Action $action -Trigger $trigger
```

### Шаг 3: Настройте переменные окружения

Добавьте в `.env`:

```env
# Секретный ключ для cron endpoint
CRON_SECRET=your-super-secret-cron-key-12345
```

## Ручная синхронизация

Вы можете запустить синхронизацию вручную в любое время:

1. Перейдите в **LDAP / Active Directory**
2. Нажмите на **⋮** (три точки)
3. Выберите **"Синхронизировать сейчас"**
4. Подождите несколько секунд
5. Увидите результат: "Найдено: X, Создано: Y, Обновлено: Z"

## Фильтрация пользователей

Система автоматически исключает:

### ❌ Компьютеры
- Все аккаунты, заканчивающиеся на `$`
- Пример: `DESKTOP-ABC123$`, `SERVER01$`
- **Двойная проверка**: в фильтре LDAP + в коде

### ❌ Системные аккаунты
- `krbtgt` - Kerberos Ticket Granting Ticket
- `Guest` - Гостевая учетная запись
- `DefaultAccount` - Встроенный системный аккаунт

### ❌ Отключенные пользователи
- Аккаунты с флагом `userAccountControl:1.2.840.113556.1.4.803:=2`

### ✅ Синхронизируются только
- Активные пользователи (`objectClass=user`, `objectCategory=person`)
- С валидным `sAMAccountName`
- Без системных префиксов

## 🔄 Автоматическая деактивация

Синхронизация также **автоматически деактивирует** пользователей, которые:
- ❌ Удалены из Active Directory
- ❌ Отключены в Active Directory
- ❌ Больше не соответствуют фильтру поиска

**Что происходит:**
1. Система находит всех пользователей в AD
2. Сравнивает с пользователями в БД (только LDAP-пользователей, у которых `password = ""`)
3. Пользователи, которых нет в AD → `isActive = false`
4. Пользователи, которые снова появились в AD → `isActive = true` (реактивация)

**Важно:** Локальные пользователи (с паролем) никогда не деактивируются автоматически!

## API Endpoints

### Ручная синхронизация
```http
POST /api/ldap/{configId}/sync
Authorization: Bearer {session_token}

Response:
{
  "success": true,
  "usersFound": 405,
  "usersCreated": 15,
  "usersUpdated": 390,
  "usersDeactivated": 5,
  "users": [...] // Первые 10 для превью
}
```

### Автоматическая синхронизация (cron)
```http
GET /api/cron/ldap-sync
Authorization: Bearer {CRON_SECRET}

Response:
{
  "success": true,
  "totalConfigs": 2,
  "results": [
    {
      "configId": "xxx",
      "configName": "Corporate AD",
      "success": true,
      "usersFound": 627,
      "usersCreated": 5,
      "usersUpdated": 622
    }
  ]
}
```

## Мониторинг

### Логи синхронизации

Логи записываются в консоль сервера:

```
[LDAP Sync] Starting sync for config: Corporate AD
[LDAP Sync] Bind successful, searching for users...
[LDAP Sync] Search base: DC=company,DC=local
[LDAP Sync] Search filter: (&(objectClass=user)(objectCategory=person)...)
[LDAP Sync] Found user entry: CN=Ivanov Ivan,OU=Users,DC=company,DC=local
[LDAP Sync] User attributes: { sAMAccountName: 'ivanov', mail: 'ivanov@company.local', ... }
[LDAP Sync] Added user: Ivanov Ivan (ivanov@company.local)
[LDAP Sync] Skipping computer account: SERVER01$
[LDAP Sync] Skipping system account: krbtgt
[LDAP Sync] Search completed. Found 627 users
[LDAP Sync] Completed. Created: 15, Updated: 612
```

### Audit Logs

Все операции синхронизации логируются в таблицу `audit_logs`:
- Кто запустил синхронизацию
- Когда произошла синхронизация
- Сколько пользователей создано/обновлено

## Устранение проблем

### Синхронизация не работает

**Проблема**: Cron job не запускается

**Решение**:
1. Проверьте, что cron job настроен правильно
2. Проверьте логи: `tail -f /var/log/ldap-sync.log`
3. Убедитесь, что `CRON_SECRET` настроен в `.env`

**Проблема**: Находится 0 пользователей

**Решение**:
1. Проверьте `userSearchBase` в конфигурации
2. Проверьте `userSearchFilter`
3. Убедитесь, что учетная запись администратора имеет права на чтение пользователей

**Проблема**: Синхронизируются компьютеры

**Решение**:
1. Проверьте фильтр в конфигурации
2. Убедитесь, что используется правильный фильтр:
   ```
   (&(objectClass=user)(objectCategory=person)(!(objectClass=computer))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
   ```
3. Система также проверяет `sAMAccountName` на `$` в конце

### Слишком много пользователей

**Проблема**: Синхронизируется > 1000 пользователей, что занимает много времени

**Решение**:
1. Используйте более специфичный `userSearchBase`:
   - Вместо `DC=company,DC=local`
   - Используйте `OU=Employees,DC=company,DC=local`
2. Уменьшите `sizeLimit` в коде
3. Используйте фильтр по OU в `userSearchFilter`

## Производительность

- **Время синхронизации**: ~1-2 секунды на 100 пользователей
- **Таймаут**: 30 секунд
- **Максимум пользователей**: 500 за один запуск
- **Пагинация**: По 100 пользователей на страницу

## Безопасность

1. **CRON_SECRET**: Обязательно измените в production
2. **Секретный endpoint**: `/api/cron/ldap-sync` защищен Bearer токеном
3. **Логи**: Не логируются пароли
4. **RLS**: Каждая конфигурация привязана к своей организации

## Best Practices

1. **Интервал синхронизации**: Рекомендуется 1-4 часа
2. **Мониторинг**: Настройте алерты на ошибки синхронизации
3. **Логи**: Регулярно проверяйте логи синхронизации
4. **Тестирование**: Сначала протестируйте на небольшой группе пользователей
5. **Резервное копирование**: Делайте backup БД перед массовой синхронизацией

## Примеры использования

### Синхронизация каждый час (Linux)
```bash
0 * * * * curl -H "Authorization: Bearer my-secret-key" https://onpoints.it/api/cron/ldap-sync
```

### Синхронизация каждые 6 часов (Windows PowerShell)
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-Command `"Invoke-WebRequest -Uri 'http://localhost:3000/api/cron/ldap-sync' -Headers @{'Authorization'='Bearer my-secret-key'}`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 6)

Register-ScheduledTask -TaskName "LDAP Sync Every 6 Hours" -Action $action -Trigger $trigger -RunLevel Highest
```

### Синхронизация только в рабочие часы
```bash
# Понедельник-Пятница, 9:00-18:00, каждый час
0 9-18 * * 1-5 curl -H "Authorization: Bearer my-secret-key" https://onpoints.it/api/cron/ldap-sync
```

---

**Готово!** Автоматическая синхронизация настроена! 🎉

