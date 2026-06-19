import express from "express";

const router = express.Router();
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  addFavoriteContactController,
  getBalanceController,
  getFavoriteContactsController,
  getRecentCounterpartiesController,
  getTransactionByIdController,
  getTransactionsController,
} from "./user.controller.js";

router.get("/getBalance", requireAuth, getBalanceController);
router.get("/transactions", requireAuth, getTransactionsController);
router.get(
  "/transactions/:transactionId",
  requireAuth,
  getTransactionByIdController,
);
router.get(
  "/recent-counterparties",
  requireAuth,
  getRecentCounterpartiesController,
);
router.post("/favorites", requireAuth, addFavoriteContactController);
router.get("/favorites", requireAuth, getFavoriteContactsController);

export default router;
