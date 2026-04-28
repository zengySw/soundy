# soundy
my site where you can install sounds, listen them and you can install widget in your desktop

## Environment setup

Create local env files from examples:

```bash
cp backend/env.example backend/.env
cp frontend/env.local.example frontend/.env.local
```

Important defaults:
- `backend/.env`: `MEDIA_DRIVER=local`, `PLAYLIST_REALTIME_ENABLED=false`
- `frontend/.env.local`: `NEXT_PUBLIC_PLAYLIST_REALTIME_ENABLED=false`

Initialize PostgreSQL schema:

```bash
cd backend
npm run db:init
```

## Run

```bash
start.bat
```

## Quality checks

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm run build
```
