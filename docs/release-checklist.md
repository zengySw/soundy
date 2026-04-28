# Soundy MVP Release Checklist

## Pre-release
- [ ] `backend/.env` and `frontend/.env.local` match target environment.
- [ ] `backend` checks pass: `npm run typecheck` and `npm test`.
- [ ] `frontend` build passes: `npm run build`.
- [ ] `/api/health` responds with `status: ok`.
- [ ] Manual smoke flow passes:
  - [ ] register/login/logout
  - [ ] play a track + cover loads
  - [ ] add/remove favorite
  - [ ] create playlist + add/remove/reorder track
  - [ ] invite link create + invite accept
  - [ ] search returns results

## Deploy
- [ ] Deploy backend first.
- [ ] Verify backend health endpoint in cloud.
- [ ] Deploy frontend with correct `NEXT_PUBLIC_API_URL`.
- [ ] Verify CORS from production frontend origin.

## Post-release
- [ ] Review backend logs for 5xx bursts in first 30 minutes.
- [ ] Verify admin upload still works.
- [ ] Verify recommendations endpoint returns either items or empty list without 500.
