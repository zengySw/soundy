import { registerUser, loginUser, getSessionByToken, deleteSession } from "../service/auth.service.js";
import { config } from "../config/env.js";
import { registerSchema } from "../validators/auth.validator.js";


// ---------- REGISTER ----------
export async function register(req, res) {

    try {

        const { error, value } = registerSchema.validate(req.body);

        if (error)
            return res.status(400).json({ message: error.message });

        await registerUser(value);

        res.status(201).json({ message: "User created" });

    } catch (err) {

        if (err.message === "EMAIL_EXISTS")
            return res.status(409).json({ message: "Email already exists" });

        res.status(500).json({ message: "Server error" });
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

    } catch {

        res.status(401).json({ message: "Invalid credentials" });
    }
}

export async function me(req, res) {
    try {
        const sessionToken = req.cookies?.session;
        if (!sessionToken) {
            return res.status(401).json({ message: "No session" });
        }
        const session = await getSessionByToken(sessionToken);
        if (!session) {
            return res.status(401).json({ message: "Invalid session" });
        }
        res.json({ userId: session.userId });
    } catch {
        res.status(401).json({ message: "Invalid session" });
    }
}

export async function logout(req, res) {
    try {
        const sessionToken = req.cookies?.session;
        if (sessionToken) {
            await deleteSession(sessionToken);
        }
        res.clearCookie("session");
        res.json({ message: "Logged out" });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
}
