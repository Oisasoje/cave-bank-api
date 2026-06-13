import express from "express";

const router = express.Router();
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  getBalanceController,
  getRecentTransactionsController,
} from "./user.controller.js";

router.get("/getBalance", requireAuth, getBalanceController);
router.get(
  "/getRecentTransactions",
  requireAuth,
  getRecentTransactionsController,
);

export default router;
