import express from "express";

const router = express.Router();
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getBalanceController } from "./user.controller.js";

router.get("/getBalance", requireAuth, getBalanceController);

export default router;
