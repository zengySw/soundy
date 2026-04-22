import { getAdminOtp } from "../utils/admin-otp.util.js";
import { getSessionByToken } from "../service/auth.service.js";

export async function adminMiddleware(req, res, next) {
  try {
    const session_token = req.cookies?.session;
    if (!session_token) {
      return res.status(401).json({ message: "No session" });
    }

    const session = await getSessionByToken(session_token);
    if (!session?.userId) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const provided_otp = String(req.get("X-Admin-Otp") || "").trim();
    const current_otp = getAdminOtp();
    if (!provided_otp || provided_otp !== current_otp) {
      return res.status(401).json({ message: "Invalid admin otp" });
    }

    req.admin = {
      userId: String(session.userId),
      role: "owner",
    };
    return next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(401).json({ message: "Invalid session" });
  }
}
