import { Request, Response } from "express";
import { getBalance, getRecentTransactions } from "./user.service.js";

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

export async function getRecentTransactionsController(
  req: Request,
  res: Response,
) {
  try {
    const accountId = req.accountId;
    if (!accountId) {
      return res.status(400).json({ error: "Missing account ID" });
    }

    const transactions = await getRecentTransactions(accountId, 10);
    return res.status(200).json({ data: transactions });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to get recent transactions",
    });
  }
}
