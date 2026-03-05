import bcrypt from "bcrypt";
import { poolPromise, sql } from "../db.js";
import { randomUUID } from "crypto";
import { config } from "../config/env.js";
import { ensureFavoritesPlaylist } from "./favorites.service.js";


// ---------- РЕГИСТРАЦИЯ ----------
// backend/src/service/auth.service.js

export async function registerUser(data) {
    const {
        username,
        email,
        password,
        country_code = null
    } = data;

    const pool = await poolPromise;
    const passHash = await bcrypt.hash(password, 10);

    try {
        const result = await pool.request()
            .input("username",     sql.NVarChar(50),   username)
            .input("email",        sql.NVarChar(255),  email)
            .input("password_hash", sql.NVarChar(sql.MAX), passHash)
            .input("avatar_url",   sql.NVarChar(500),  null)
            .input("is_premium",   sql.Bit,            0)
            .input("country_code", sql.Char(2),        country_code)
            .input("is_active",    sql.Bit,            1)
            .query(`
                INSERT INTO users (
                    username, email, password_hash, avatar_url,
                    is_premium, country_code, is_active
                )
                OUTPUT inserted.id
                VALUES (
                    @username, @email, @password_hash, @avatar_url,
                    @is_premium, @country_code, @is_active
                )
            `);

        const userId = result.recordset?.[0]?.id;
        if (userId) {
            await ensureFavoritesPlaylist(userId);
        }

        return true;
    } catch (err) {
        if (err.number === 2627) { // нарушение UNIQUE constraint
            throw new Error("EMAIL_EXISTS");
        }
        console.error("Ошибка регистрации:", err);
        throw err;
    }
}





// ---------- ЛОГИН ----------
export async function loginUser(email, password, deviceInfo) {
    const pool = await poolPromise;

    const result = await pool.request()
        .input("email", sql.NVarChar(255), email)
        .query(`
            SELECT id, password_hash, is_active
            FROM users
            WHERE email = @email
        `);

    const user = result.recordset[0];

    if (!user || !user.is_active) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
        throw new Error("INVALID_CREDENTIALS");
    }

    const sessionToken = randomUUID();
    const sessionMaxAgeMs = config.SESSION_MAX_AGE_DAYS * 24 * 3600 * 1000;

    // Сохраняем сессию (refresh token)
    await pool.request()
        .input("user_id",       sql.UniqueIdentifier, user.id)
        .input("device_info",   sql.NVarChar(255),    deviceInfo || "unknown")
        .input("refresh_token", sql.NVarChar(sql.MAX), sessionToken)
        .input("expires_at",    sql.DateTime2,        new Date(Date.now() + sessionMaxAgeMs))
        .input("last_used_at",  sql.DateTime2,        new Date())
        .query(`
            INSERT INTO user_sessions (
                user_id, device_info, refresh_token, expires_at, last_used_at
            ) VALUES (
                @user_id, @device_info, @refresh_token, @expires_at, @last_used_at
            )
        `);

    return { sessionToken, userId: user.id };
}

export async function getSessionByToken(sessionToken) {
    if (!sessionToken) {
        return null;
    }
    const pool = await poolPromise;
    const result = await pool.request()
        .input("refresh_token", sql.NVarChar(sql.MAX), sessionToken)
        .query(`
            SELECT user_id, expires_at
            FROM user_sessions
            WHERE refresh_token = @refresh_token
        `);

    const session = result.recordset[0];
    if (!session) {
        return null;
    }
    if (session.expires_at && new Date(session.expires_at) <= new Date()) {
        return null;
    }

    await pool.request()
        .input("refresh_token", sql.NVarChar(sql.MAX), sessionToken)
        .input("last_used_at", sql.DateTime2, new Date())
        .query(`
            UPDATE user_sessions
            SET last_used_at = @last_used_at
            WHERE refresh_token = @refresh_token
        `);

    return { userId: session.user_id };
}

export async function deleteSession(sessionToken) {
    if (!sessionToken) {
        return;
    }
    const pool = await poolPromise;
    await pool.request()
        .input("refresh_token", sql.NVarChar(sql.MAX), sessionToken)
        .query(`
            DELETE FROM user_sessions
            WHERE refresh_token = @refresh_token
        `);
}
