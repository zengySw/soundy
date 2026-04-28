import { getAdminOtp } from "../utils/admin-otp.util.js";
import { getSessionByToken } from "../service/auth.service.js";
import { send_api_error } from "../utils/api-response.util.js";
import { is_database_unavailable_error } from "../utils/database-error.util.js";

export async function adminMiddleware(req, res, next) {
  try {
    const session_token = req.cookies?.session;
    if (!session_token) {
      return send_api_error(res, {
        status: 401,
        code: "NO_SESSION",
        message: "No session",
      });
    }

    const session = await getSessionByToken(session_token);
    if (!session?.userId) {
      return send_api_error(res, {
        status: 401,
        code: "INVALID_SESSION",
        message: "Invalid session",
      });
    }

    const provided_otp = String(req.get("X-Admin-Otp") || "").trim();
    const current_otp = getAdminOtp();
    if (!provided_otp || provided_otp !== current_otp) {
      return send_api_error(res, {
        status: 401,
        code: "INVALID_ADMIN_OTP",
        message: "Invalid admin otp",
      });
    }

    req.admin = {
      userId: String(session.userId),
      role: "owner",
    };
    return next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    if (is_database_unavailable_error(error)) {
      return send_api_error(res, {
        status: 503,
        code: "DB_UNAVAILABLE",
        message: "Database unavailable",
      });
    }
    return send_api_error(res, {
      status: 401,
      code: "INVALID_SESSION",
      message: "Invalid session",
    });
  }
}
