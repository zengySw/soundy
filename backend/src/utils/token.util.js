import crypto from "crypto";
import jwt from "jsonwebtoken";

const BASE_SECRET = process.env.JWT_SECRET;

// динамический секрет по часу
function getSecretForHour(date = new Date()) {
    const hourKey =
        date.getUTCFullYear() + "-" +
        (date.getUTCMonth() + 1) + "-" +
        date.getUTCDate() + "-" +
        date.getUTCHours();

    return crypto
        .createHmac("sha256", BASE_SECRET)
        .update(hourKey)
        .digest("hex");
}

// ACCESS TOKEN
export function generateAccessToken(payload) {
    const secret = getSecretForHour();

    return jwt.sign(payload, secret, {
        expiresIn: "1h"
    });
}

// VERIFY ACCESS TOKEN
export function verifyAccessToken(token) {

    const secrets = [
        getSecretForHour(),
        getSecretForHour(new Date(Date.now() - 3600000))
    ];

    for (const secret of secrets) {
        try {
            return jwt.verify(token, secret);
        } catch {}
    }

    throw new Error("INVALID_TOKEN");
}

// REFRESH TOKEN (обычный, долгий)
export function generateRefreshToken(payload) {
    return jwt.sign(payload, BASE_SECRET, {
        expiresIn: "7d"
    });
}
