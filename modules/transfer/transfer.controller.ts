import { Request, Response } from "express";
import transferService from "./transfer.service.js";

export default async function transferController(req: Request, res: Response) {
  try {
    const { fromAccountId, toAccountId, amount, reference, reason } = req.body;

    const initiatedById = req.user.id; // assume auth middleware

    // BASIC GUARDS (not business logic)
    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ error: "Missing accounts" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!reference) {
      return res.status(400).json({ error: "Missing reference" });
    }

    const transaction = await transferService({
      fromAccountId,
      toAccountId,
      amount,
      reference,
      reason,
      initiatedById,
    });

    return res.status(201).json({
      success: true,
      transaction,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Transfer failed",
    });
  }
}
