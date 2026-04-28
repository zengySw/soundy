import { getSessionByToken } from "../service/auth.service.js";
import { send_api_error } from "../utils/api-response.util.js";
import { is_database_unavailable_error } from "../utils/database-error.util.js";

export async function authMiddleware(req, res, next) {

    try {

        const sessionToken = req.cookies?.session;
        if (!sessionToken) {
            return send_api_error(res, {
                status: 401,
                code: "NO_SESSION",
                message: "No session"
            });
        }

        const session = await getSessionByToken(sessionToken);
        if (!session) {
            return send_api_error(res, {
                status: 401,
                code: "INVALID_SESSION",
                message: "Invalid session"
            });
        }

        req.user = { userId: session.userId };

        next();

    } catch (error) {
        if (is_database_unavailable_error(error)) {
            return send_api_error(res, {
                status: 503,
                code: "DB_UNAVAILABLE",
                message: "Database unavailable"
            });
        }

        return send_api_error(res, {
            status: 401,
            code: "INVALID_SESSION",
            message: "Invalid session"
        });
    }
}
