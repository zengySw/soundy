import { getSessionByToken } from "../service/auth.service.js";

export async function authMiddleware(req, res, next) {

    try {

        const sessionToken = req.cookies?.session;
        if (!sessionToken) {
            return res.status(401).json({ message: "No session" });
        }

        const session = await getSessionByToken(sessionToken);
        if (!session) {
            return res.status(401).json({ message: "Invalid session" });
        }

        req.user = { userId: session.userId };

        next();

    } catch {

        res.status(401).json({ message: "Invalid session" });
    }
}
