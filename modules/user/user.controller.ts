import { Request, Response } from "express";
import { getBalance, getTransactions } from "./user.service.js";

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
