# Server Status

Последнее обновление: 2026-04-30

## Локальная среда

- Приложение: `http://localhost:3000`
- БД (по умолчанию): `localhost:5432`
- Prisma Studio: `bun run db:studio`

## Проверенные команды

```bash
bun install
bun run dev
bun run lint
bun run build
```

## Текущее техническое состояние

- Build успешен.
- Линтер проходит с предупреждениями по `react-hooks/exhaustive-deps`.
- Для части маршрутов во время `next build` могут логироваться `dynamic server usage` сообщения (ожидаемо для dynamic API routes).

## Docker Compose

Базовый запуск:

```bash
docker-compose up -d
```

С профилем `production` (включая nginx):

```bash
docker-compose --profile production up -d
```

Проверка:

```bash
docker-compose ps
curl http://localhost:3000/api/health
```

## Важно

- Для корректной проверки API, зависящих от БД, PostgreSQL должен быть доступен.
- Перед запуском убедиться, что заполнены обязательные переменные из `.env.example`.
