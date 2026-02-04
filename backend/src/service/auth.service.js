import bcrypt from "bcrypt";
import { poolPromise, sql } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import {
    generateAccessToken,
    generateRefreshToken
} from "../utils/token.util.js";


// ---------- РЕГИСТРАЦИЯ ----------
export async function registerUser(data) {
    const {
        username,
        email,
        password,
        country_code
    } = data;

    const pool = await poolPromise;
    const hash = await bcrypt.hash(password, 10);

    await pool.request()
        .input("username", sql.NVarChar, username)
        .input("email", sql.NVarChar, email)
        .input("password_hash", sql.NVarChar, hash)
        .input("country_code", sql.Char(2), country_code || null)
        .input("is_active", sql.Bit, 1)
        .query(`
            INSERT INTO users (username,email,password_hash,country_code,is_active)
            VALUES (@username,@email,@password_hash,@country_code,@is_active)
        `);

    return true;
}






// ---------- ЛОГИН ----------
export async function loginUser(email, password, deviceInfo) {

    const pool = await poolPromise;

    const userResult = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT * FROM users WHERE email = @email");

    const user = userResult.recordset[0];

    if (!user)
        throw new Error("INVALID_CREDENTIALS");

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid)
        throw new Error("INVALID_CREDENTIALS");


    // создаём токены
    const payload = {
        userId: user.id
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // сохраняем refresh токен в БД
    await pool.request()
        .input("id", sql.UniqueIdentifier, uuidv4())
        .input("user_id", sql.UniqueIdentifier, user.id)
        .input("device_info", sql.NVarChar, deviceInfo || "unknown")
        .input("refresh_token", sql.NVarChar, refreshToken)
        .input("expires_at", sql.DateTime2, new Date(Date.now() + 7*24*3600000))
        .query(`
            INSERT INTO user_sessions
            (id,user_id,device_info,refresh_token,expires_at)
            VALUES (@id,@user_id,@device_info,@refresh_token,@expires_at)
        `);

    return { accessToken, refreshToken };
}
