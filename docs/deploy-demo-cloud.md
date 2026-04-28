# Demo Cloud Deployment (Vercel + Railway + Cloudflare R2)

## 1. Backend (Railway)
- Create a Railway project for `backend`.
- Provision PostgreSQL and copy `PG_DATABASE_URL`.
- Set backend env vars from `backend/env.example`.
- For media in R2 set:
  - `MEDIA_DRIVER=r2`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- Run DB init once: `npm run db:init`.
- Verify `GET /api/health`.

## 2. Frontend (Vercel)
- Create a Vercel project for `frontend`.
- Set:
  - `NEXT_PUBLIC_API_URL` to Railway backend URL
  - `NEXT_PUBLIC_PLAYLIST_REALTIME_ENABLED=false`
- Deploy and verify auth + tracks + playlists flow.

## 3. Post-deploy smoke
- Register/login from production URL.
- Open home page and play at least one track.
- Add/remove favorite.
- Create playlist and invite link.
- Open search page and verify results.
