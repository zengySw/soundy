import { getSessionByToken } from "./auth.service.js";

export async function resolve_session_user_id(req) {
  const session_token = req.cookies?.session;
  if (!session_token) {
    return null;
  }

  const session = await getSessionByToken(session_token);
  if (!session?.userId) {
    return null;
  }

  return String(session.userId);
}
