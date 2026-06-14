import express from "express";

const router = express.Router();
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  getBalanceController,
  getTransactionsController,
} from "./user.controller.js";

router.get("/getBalance", requireAuth, getBalanceController);
router.get("/transactions", requireAuth, getTransactionsController);

export default router;
