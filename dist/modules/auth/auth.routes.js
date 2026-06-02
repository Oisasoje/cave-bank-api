import express from "express";
import { me, logout, start, verify } from "./auth.controller.js";
import { loginLimiter } from "../../middleware/auth.middleware.js";
const router = express.Router();
router.post("/start", loginLimiter, start);
router.post("/verify", loginLimiter, verify);
router.get("/me", me);
router.post("/logout", logout);
export default router;
