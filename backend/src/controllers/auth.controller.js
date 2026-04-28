import { registerUser, loginUser, getSessionByToken, deleteSession } from "../service/auth.service.js";
import { config } from "../config/env.js";
import { registerSchema } from "../validators/auth.validator.js";
import { send_api_error } from "../utils/api-response.util.js";
import { is_database_unavailable_error } from "../utils/database-error.util.js";


// ---------- REGISTER ----------
export async function register(req, res) {

    try {

        const { error, value } = registerSchema.validate(req.body);

        if (error)
            return send_api_error(res, {
                status: 400,
                code: "REGISTER_VALIDATION_FAILED",
                message: error.message
            });

        await registerUser(value);

        res.status(201).json({ ok: true, message: "User created" });

    } catch (err) {

        if (err.message === "EMAIL_EXISTS")
            return send_api_error(res, {
                status: 409,
                code: "EMAIL_EXISTS",
                message: "Email already exists"
            });

        return send_api_error(res, {
            status: 500,
            code: "REGISTER_FAILED",
            message: "Server error"
        });
    }
}



// ---------- LOGIN ----------
export async function login(req, res) {

    try {

        const { email, password } = req.body;

        const device = req.headers["user-agent"];

        const { sessionToken, userId } = await loginUser(email, password, device);

        res.cookie("session", sessionToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: config.NODE_ENV === "production",
            maxAge: config.SESSION_MAX_AGE_DAYS * 24 * 3600 * 1000,
        });

        res.json({ userId });

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
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials"
        });
    }
}

export async function me(req, res) {
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
        return res.json({ userId: session.userId });
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

export async function logout(req, res) {
    try {
        const sessionToken = req.cookies?.session;
        if (sessionToken) {
            await deleteSession(sessionToken);
        }
        res.clearCookie("session");
        return res.json({ ok: true, message: "Logged out" });
    } catch {
        return send_api_error(res, {
            status: 500,
            code: "LOGOUT_FAILED",
            message: "Server error"
        });
    }
}
