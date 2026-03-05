import { getSessionByToken } from "../service/auth.service.js";
import { getAdminByUserId } from "../service/admins.service.js";
import { getAdminOtp } from "../utils/admin-otp.util.js";

export async function adminMiddleware(req, res, next) {
  try {
    const sessionToken = req.cookies?.session;
    if (!sessionToken) {
      return res.status(401).json({ message: "No session" });
    }

    const session = await getSessionByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const otp = req.headers["x-admin-otp"];
    if (!otp || otp !== getAdminOtp()) {
      return res.status(401).json({ message: "Invalid admin otp" });
    }

    const admin = await getAdminByUserId(session.userId);
    if (!admin) {
      return res.status(403).json({ message: "Not an admin" });
    }

    req.user = { userId: session.userId };
    req.admin = {
      userId: admin.user_id,
      role: (admin.role || "admin").toLowerCase(),
      note: admin.note ?? null,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
