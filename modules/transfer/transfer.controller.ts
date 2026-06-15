import { Request, Response } from "express";
import { transferAction, verifyReciepient } from "./transfer.service.js";
import { log } from "@oisasoje/gloo";

export async function transferController(req: Request, res: Response) {
  try {
    const { pin, fromAccountId, toAccountId, amount, reason } = await req.body;

    console.log(
      pin,
      fromAccountId,
      toAccountId,
      amount,
      reason,
      "hello from controller",
    );

    const initiatedById = req.user.id;

    log("Received transfer request, doing basic validation");

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

    log(
      `Initiating transfer from account ${fromAccountId} to ${toAccountId} for amount ${amount} by user ${initiatedById}`,
    );

    const { transaction, receiverUser, senderUser } = await transferAction({
      pin,
      fromAccountId,
      toAccountId,
      amount,

      reason,
      initiatedById,
    });

    return res.status(201).json({
      message: { success: true },

      data: {
        transaction,
        receiverUserName: receiverUser.name,
        senderUserName: senderUser.name,
      },
    });
  } catch (err: any) {
    log("Transfer failed with error: " + err.message);
    //check for transaction time expiration
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

    log(`${walletAddress}, ${req.walletAddress}`);
    const senderWalletAddress = req.walletAddress;
    if (!senderWalletAddress) {
      return res.status(400).json({ error: "Missing sender wallet address" });
    }

    const data = await verifyReciepient(walletAddress, senderWalletAddress);
    return res.status(200).json({ user: data });
  } catch (err: any) {
    log("Failed to verify recipient with error: " + err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to verify recipient",
    });
  }
}
