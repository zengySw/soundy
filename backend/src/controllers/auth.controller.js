import { registerUser, loginUser } from "../service/auth.service.js";
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

        const tokens = await loginUser(email, password, device);

        res.json(tokens);

    } catch {

        res.status(401).json({ message: "Invalid credentials" });
    }
}
