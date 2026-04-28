# Soundy MVP Rollback Procedure

## Trigger conditions
- Release causes repeated 5xx errors on core routes (`/api/auth`, `/api/tracks`, `/api/playlists`).
- Users cannot log in or play tracks.
- CORS/session failures block all client requests.

## Steps
1. Pause new deploys.
2. Roll frontend back to previous stable deployment.
3. Roll backend back to previous stable deployment.
4. Keep database schema unchanged unless migration is proven safe to revert.
5. Verify `/api/health` and run the manual smoke flow.

## Data safety notes
- Never delete user data during rollback.
- If media driver was switched to `r2`, do not remove already uploaded objects.
- If invite acceptance was partially used, keep `playlist_invites` and `playlist_collaborators` as-is.

## Incident follow-up
- Capture failing request IDs from backend logs.
- Document root cause and remediation PR.
- Add or extend automated test coverage for the regression.
