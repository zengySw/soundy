import { Router } from "express";
import { getUserProfile } from "../controllers/users.controller.js";

const router = Router();

router.get("/:id", getUserProfile);

export default router;
