import { Request, Response } from "express";
import { transferAction, verifyReciepient } from "./transfer.service.js";
import { log } from "@oisasoje/gloo";

export async function transferController(req: Request, res: Response) {
  try {
    log(req.auth);
    const { pin, fromAccountId, toAccountId, amount, reason } = await req.body;

    log(
      `Initiating transfer from ${fromAccountId} to ${toAccountId} for amount ${amount}`,
    );
    log("Failed basic validation check 1 ........");

    const initiatedById = req.user.id;

    // BASIC GUARDS (not business logic)
    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ error: "Missing accounts" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // if (!reference) {
    //   return res.status(400).json({ error: "Missing reference" });
    // }

    const transaction = await transferAction({
      pin,
      fromAccountId,
      toAccountId,
      amount,

      reason,
      initiatedById,
    });

    return res.status(201).json({
      message: { success: true },

      data: { transaction },
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Transfer failed",
    });
  }
}

export async function verifyReciepientController(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "Missing wallet address" });
    }

    const data = await verifyReciepient(walletAddress);
    return res.status(200).json({ user: data });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to verify recipient",
    });
  }
}
