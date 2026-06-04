import express from "express";
import {
  me,
  logout,
  loginStart,
  loginVerify,
  signupStart,
  signupVerifyOTP,
  createPin,
  resendOTP,
} from "./auth.controller.js";
import {
  loginLimiter,
  signupLimiter,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup/start", signupLimiter, signupStart);
router.post("/signup/verify", signupLimiter, signupVerifyOTP);
router.post("/signup/resend-otp", signupLimiter, resendOTP);
router.post("/signup/pin", createPin);
router.post("/login/start", loginLimiter, loginStart);
router.post("/login/verify", loginLimiter, loginVerify);

router.get("/me", me);
router.post("/logout", logout);

export default router;
