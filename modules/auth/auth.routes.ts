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
  verifyUserPinController,
  changeUserPinController,
  resetPinStart,
  resetPinVerifyOTP,
  resetPinSetNew,
  resetPinResendOTP,
} from "./auth.controller.js";
import {
  loginLimiter,
  requireAuth,
  signupLimiter,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup/start", signupLimiter, signupStart);
router.post("/signup/verify", signupLimiter, signupVerifyOTP);
router.post("/signup/resend-otp", signupLimiter, resendOTP);
router.post("/signup/create-pin", signupLimiter, createPin);
router.post("/login/start", loginLimiter, loginStart);
router.post("/login/verify", loginLimiter, loginVerify);
router.post("/verify-pin", requireAuth, loginLimiter, verifyUserPinController);
router.post("/change-pin", requireAuth, loginLimiter, changeUserPinController);
router.post("/reset-pin/start", resetPinStart);
router.post("/reset-pin/verify-otp", resetPinVerifyOTP);
router.post("/reset-pin/set-new-pin", resetPinSetNew);
router.post("/reset/resend-otp", resetPinResendOTP);

router.get("/me", me);
router.post("/logout", logout);

export default router;
