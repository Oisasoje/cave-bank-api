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
  removeFavoriteContactController,
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
router.post("/add-favorites", requireAuth, addFavoriteContactController);
router.get("/get-favorites", requireAuth, getFavoriteContactsController);
router.delete(
  "/favorites/:favoriteId",
  requireAuth,
  removeFavoriteContactController,
);

export default router;
