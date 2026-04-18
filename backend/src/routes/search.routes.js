import { Router } from "express";
import { get_search_results } from "../controllers/search.controller.js";

const router = Router();

router.get("/", get_search_results);

export default router;
