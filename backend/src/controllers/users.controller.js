import { getUserById } from "../service/users.service.js";

function isUuid(value) {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function getUserProfile(req, res) {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
