# soundy
my site where you can install sounds, listen them and you can install widget in your desktop

## Environment setup

Create local env files from examples:

```bash
cp backend/env.example backend/.env
cp frontend/env.local.example frontend/.env.local
```

Initialize PostgreSQL schema:

```bash
cd backend
npm run db:init
```
