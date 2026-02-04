import { verifyAccessToken } from "../utils/token.util.js";

export function authMiddleware(req, res, next) {

    try {

        const header = req.headers.authorization;

        if (!header)
            return res.status(401).json({ message: "No token" });

        const token = header.split(" ")[1];

        const decoded = verifyAccessToken(token);

        req.user = decoded;

        next();

    } catch {

        res.status(401).json({ message: "Invalid token" });
    }
}
