import { Request, Response } from "express";
import {
  addFavoriteContacts,
  getBalance,
  getFavoriteContacts,
  getRecentCounterparties,
  getTransactionById,
  getTransactions,
} from "./user.service.js";

export async function getBalanceController(req: Request, res: Response) {
  try {
    const walletAddress = req.walletAddress;
    if (!walletAddress) {
      return res.status(400).json({ error: "Missing wallet address" });
    }

    const data = await getBalance(walletAddress);
    return res.status(200).json({ data });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to get balance",
    });
  }
}

export async function getTransactionsController(req: Request, res: Response) {
  try {
    const accountId = req.accountId;
    if (!accountId) {
      return res.status(400).json({ error: "Missing account ID" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const cursor = req.query.cursor as string | undefined;

    const result = await getTransactions(accountId, limit, cursor);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to get recent transactions",
    });
  }
}

export async function getTransactionByIdController(
  req: Request,
  res: Response,
) {
  try {
    const transactionId = req.params.transactionId;

    if (!transactionId || Array.isArray(transactionId)) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    const transaction = await getTransactionById(transactionId);
    return res.status(200).json(transaction);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to get transaction",
    });
  }
}

export async function addFavoriteContactController(
  req: Request,
  res: Response,
) {
  try {
    const { favoriteUserIds } = req.body;
    const userId = req.user.id;

    if (!userId || !Array.isArray(favoriteUserIds)) {
      return res.status(400).json({ error: "Missing or invalid input" });
    }

    const favoriteIdsArray = await addFavoriteContacts(userId, favoriteUserIds);

    return res.status(200).json({
      favoriteUserIds: favoriteIdsArray,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to add favorite contact",
    });
  }
}

export async function getFavoriteContactsController(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const favorites = await getFavoriteContacts(userId);

    return res.status(200).json({
      data: favorites,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch favorite contacts",
    });
  }
}

export async function getRecentCounterpartiesController(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (Number.isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: "Invalid limit value" });
    }

    const data = await getRecentCounterparties(userId, limit);

    return res.status(200).json({
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch recent counterparties",
    });
  }
}
