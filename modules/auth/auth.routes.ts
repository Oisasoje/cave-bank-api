import express from "express";
import {
  me,
  logout,
  loginStart,
  loginVerify,
  signupStart,
} from "./auth.controller.js";
import {
  loginLimiter,
  signupLimiter,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup/start", signupLimiter, signupStart);
router.post("/login/start", loginLimiter, loginStart);
router.post("/login/verify", loginLimiter, loginVerify);

router.get("/me", me);
router.post("/logout", logout);

export default router;
