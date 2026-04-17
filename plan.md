# Soundy — план разработки

## 1️⃣ Архитектура сервиса

Цель: отделить фронтенд, бэкенд, базу данных, кеш и хранение файлов.

```
[Next.js Frontend] → [Node.js API Server] → [PostgreSQL + pgvector]
                                      ↘ [Redis (кеш + очереди)]
                                      ↘ [Cloudflare R2 + CDN (аудио)]
                                      ↘ [BullMQ (AI задачи)]
```

Советы:
- PostgreSQL хранит всю «истину»: пользователи, треки, плейлисты, лайки, историю прослушиваний.
- pgvector — расширение для векторного поиска, нужно для ИИ-рекомендаций.
- Redis ускоряет часто читаемые данные: лайки, плейлисты, недавние треки.
- BullMQ поверх Redis — очередь для долгих AI задач (генерация музыки).
- Cloudflare R2 + CDN — безопасно и быстро доставляет аудио и обложки.
- Node.js API обрабатывает бизнес-логику, выдаёт JSON для фронтенда.
- Next.js делает SSR для страниц артистов/альбомов + SPA для динамичных страниц.

---

## 2️⃣ База данных (PostgreSQL)

### Пользователи
```sql
users: id (uuid), email, username, password_hash, is_premium, created_at
user_sessions: id, user_id, token_hash, device, expires_at
```

Советы:
- Используй bcrypt для хеширования пароля.
- JWT для авторизации через API.
- Можно хранить гео (country) для аналитики.

### Контент
```sql
artists: id, name, verified
albums: id, artist_id, title, release_date
tracks: id, album_id, title, duration_ms, audio_url, cover_url, waveform_data (json), genre, explicit
track_artists: track_id, artist_id  -- M:N для фитов
track_embeddings: track_id, embedding vector(1536)  -- для AI поиска
```

### Лайки
```sql
user_track_likes: user_id, track_id, liked_at  -- составной PK
```

Советы:
- Индексы на track_id и user_id ускоряют подсчёт лайков.
- Кешировать лайки в Redis для мгновенного отображения.

### Плейлисты
```sql
playlists: id, owner_id, title, is_public, created_at
playlist_tracks: playlist_id, track_id, position, added_at
```

Советы:
- position нужен для правильного порядка (drag-and-drop).
- Soft-delete вместо удаления — добавь поле deleted_at.

### История прослушиваний
```sql
listening_events: id, user_id, track_id, played_at, play_source
```

Советы:
- Партиционируй по дате, чтобы миллионы записей не тормозили.
- Используй для рекомендаций и аналитики.

### Подписки
```sql
user_artist_follows: user_id, artist_id, followed_at
```

### Миграции
Используй Prisma для управления схемой:

```prisma
model Track {
  id         String   @id @default(uuid())
  title      String
  audio_url  String
  duration   Int
  album      Album    @relation(fields: [album_id], references: [id])
  album_id   String
  created_at DateTime @default(now())
  deleted_at DateTime?
}
```

---

## 3️⃣ Фронтенд (Next.js + TypeScript)

- SSR для страниц артистов, альбомов, плейлистов (SEO и быстрый рендер)
- SPA для динамических частей: лайки, аудио-плеер, плейлисты

### Audio Player Component
- Seek / Next / Previous / Shuffle / Repeat
- Визуализация волны через wavesurfer.js
- Стриминг через HTTP Range requests

### State management
- Zustand для плеера (глобальный стейт)
- React Query для серверных данных (треки, плейлисты)

### UI для AI функций
- Поле промпта → кнопка "Создать плейлист"
- Страница генерации музыки с прогресс-баром и пресетами
- История сгенерированных треков

---

## 4️⃣ Бэкенд (Node.js + TypeScript)

- Fastify или Express для API
- JWT для авторизации
- PostgreSQL через Prisma
- Redis для кеширования
- BullMQ для очередей AI задач

Советы:
- Минимизируй JOIN'ы, чтобы не тормозило.
- Разделяй heavy запросы (история, рекомендации) от быстрых (лайки, плейлисты).
- Rate-limit на все эндпоинты (особенно AI и загрузка файлов).

---

## 5️⃣ API эндпоинты

### Auth
```
POST /api/auth/register       — регистрация
POST /api/auth/login          — логин, возвращает JWT
POST /api/auth/logout         — инвалидация сессии
GET  /api/auth/me             — текущий пользователь
```

### Треки
```
GET  /api/tracks/:id          — информация о треке
GET  /api/tracks/:id/stream   — стриминг аудио (Range requests)
POST /api/tracks/upload       — загрузка трека (multipart)
GET  /api/tracks/search?q=    — поиск
```

### Плейлисты
```
GET    /api/playlists/:id              — плейлист
POST   /api/playlists                  — создать
PATCH  /api/playlists/:id              — обновить
DELETE /api/playlists/:id              — удалить (soft-delete)
POST   /api/playlists/:id/tracks       — добавить трек
DELETE /api/playlists/:id/tracks/:tid  — убрать трек
PATCH  /api/playlists/:id/reorder      — изменить порядок
```

### Лайки
```
POST   /api/likes/tracks/:id   — лайкнуть
DELETE /api/likes/tracks/:id   — убрать лайк
GET    /api/likes               — все лайки пользователя
```

### ИИ
```
POST /api/ai/playlist          — создать плейлист по промпту
POST /api/ai/generate          — запустить генерацию музыки
GET  /api/ai/generate/:job_id  — статус генерации (поллинг)
GET  /api/ai/recommendations   — рекомендации на основе истории
```

---

## 6️⃣ ИИ функции

### Плейлист по промпту
1. Пользователь пишет "музыка для дождливого вечера"
2. Промпт → LLM (Claude/GPT-4o) с системным промптом
3. LLM возвращает JSON фильтры:
   ```json
   { "mood": "melancholic", "tempo": "slow", "genre": ["indie"], "energy": 0.2 }
   ```
4. По фильтрам ищешь треки через pgvector embeddings

### Генерация музыки
- Интеграция с Suno API или Replicate (MusicGen)
- Генерация занимает 30–120 секунд → асинхронная очередь BullMQ
- Схема: пользователь нажал → получил job_id → фронт поллит GET /api/ai/generate/:job_id каждые 3 сек
- По готовности трек сохраняется в R2 и добавляется в БД

### Рекомендации
- На основе listening_events строишь embedding пользователя
- Средний вектор всех прослушанных треков → pgvector nearest neighbors
- Обновляй embedding раз в час через фоновую задачу BullMQ

---

## 7️⃣ Кеширование (Redis)

```
user:{id}:likes        — лайки пользователя
user:{id}:playlists    — треки в плейлистах
user:{id}:history      — последние 20–50 прослушанных треков
track:{id}:play_count  — счётчик воспроизведений
```

TTL: лайки — 5 мин, плейлисты — 10 мин, история — 1 час.

---

## 8️⃣ Хранилище и CDN

- Cloudflare R2 для аудио и обложек (бесплатный egress)
- Signed URL со сроком жизни 1 час для безопасного доступа
- Стриминг через HTTP Range requests — обязательно, иначе перемотка не работает

---

## 9️⃣ Безопасность

- Пароли только в виде bcrypt хеша
- Аудио только по signed URLs
- Soft-delete вместо удаления треков/плейлистов
- Rate-limit на лайки, загрузку, AI запросы
- Helmet.js + CORS на бэкенде
- Переменные окружения через .env — никогда не коммить в git

---

## 🔟 Тестирование

### Структура
```
tests/
├── unit/
│   ├── auth.test.ts         — JWT, bcrypt
│   ├── playlist.test.ts     — добавление/удаление треков
│   └── likes.test.ts        — счётчик лайков
└── integration/
    ├── api.test.ts           — реальные эндпоинты
    └── db.test.ts            — запросы к БД
```

### Что покрыть обязательно
- Регистрация (невалидный пароль, дубликат email)
- Создание плейлиста (пустое название, несуществующий трек)
- Лайки (дублирование, удаление несуществующего)
- Signed URL (истёкший токен)
- AI эндпоинты (невалидный промпт, несуществующий job_id)

### Инструменты
- Jest + Supertest для API тестов
- Vitest для unit тестов (быстрее Jest)
- Тестовая БД в Docker — не трогать продакшен

---

## 1️⃣1️⃣ Деплой и инфраструктура

### Docker Compose
```yaml
services:
  frontend:   # Next.js, порт 3000
  backend:    # Node.js, порт 4000
  postgres:   # порт 5432
  redis:      # порт 6379
  minio:      # S3-совместимое хранилище, порт 9000
```

### CI/CD (GitHub Actions)
```yaml
on: push to main
jobs:
  - lint + typecheck
  - run tests
  - build Docker image
  - deploy to VPS (ssh + docker pull)
```

### Хостинг
- VPS: Hetzner (дёшево) или DigitalOcean
- CDN: Cloudflare R2
- Домен + SSL: Cloudflare (бесплатно)
- Мониторинг: Sentry (ошибки) + Grafana (метрики)

---

## 1️⃣2️⃣ Идеи для фич и монетизации

- Premium: отключение рекламы, полный доступ, офлайн режим
- Реклама: вставка между треками для бесплатных пользователей
- Подписка на артистов: уведомления о новых релизах
- Совместные плейлисты: несколько владельцев
- Комментарии к плейлистам
- Аналитика для артистов: прослушивания, география

---

## 1️⃣3️⃣ Советы для курсовой / защиты

- Покажи живой фронтенд с проигрыванием треков и лайками
- Объясни нормализованную БД и составные PK для лайков и плейлистов
- Покажи Redis-кеш — это «реальный продакшен» фишка
- Объясни pgvector и как работает AI поиск
- Покажи Docker Compose — преподаватели любят воспроизводимость
- Расскажи про безопасность и монетизацию
