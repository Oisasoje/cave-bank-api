import { prisma } from "../../lib/prisma.js";
import crypto from "crypto";
import verifyPin from "../../utils/password.js";
import { log } from "@oisasoje/gloo";
import { pusher } from "../../lib/pusher.js";

export async function transferAction({
  pin,
  fromAccountId,
  toAccountId,
  amount,
  reason,
  initiatedById,
}: {
  pin: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reason?: string;
  initiatedById: string;
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
  const result = await prisma.$transaction(async (tx) => {
    const [senderAccount, receiverAccount] = await Promise.all([
      tx.accounts.findUnique({ where: { id: fromAccountId } }),
      tx.accounts.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!senderAccount) throw new Error("Invalid sender account");
    if (!receiverAccount) throw new Error("Invalid recipient account");
    if (fromAccountId === toAccountId)
      throw new Error("Cannot transfer to same account");

    if (!senderAccount.owner_id) throw new Error("Account has no owner");
    if (!receiverAccount.owner_id) throw new Error("Account has no owner");

    const senderUser = await tx.users.findUnique({
      where: { id: senderAccount.owner_id },
    });

    const receiverUser = await tx.users.findUnique({
      where: { id: receiverAccount.owner_id },
    });

    if (!senderUser) throw new Error("User not found");
    if (!receiverUser) throw new Error("User not found");

    const hashedPin = senderUser.pin_hash;
    if (!hashedPin) throw new Error("PIN not set up");

    if (senderAccount.owner_id !== initiatedById) {
      throw new Error("Unauthorized");
    }

    const validPin = await verifyPin(hashedPin, pin);
    if (!validPin) throw new Error("Invalid PIN");

    const debitResult = await tx.wallets.updateMany({
      where: {
        address: senderAccount.address,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    });

    if (debitResult.count === 0) {
      throw new Error("Insufficient funds");
    }

    await tx.wallets.update({
      where: { address: receiverAccount.address },
      data: {
        balance: { increment: amount },
      },
    });

    const transaction = await tx.transactions.create({
      data: {
        id: crypto.randomUUID(),
        amount,
        reference: crypto.randomUUID(),
        reason: reason ?? "transfer",
        initiated_by_id: initiatedById,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        from_address: senderAccount.address,
        to_address: receiverAccount.address,
      },
    });

    await tx.ledger_entries.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          transaction_id: transaction.id,
          account_id: fromAccountId,
          debit: amount,
          credit: 0,
        },
        {
          id: crypto.randomUUID(),
          transaction_id: transaction.id,
          account_id: toAccountId,
          debit: 0,
          credit: amount,
        },
      ],
    });

    return {
      transaction,
      senderUser,
      receiverUser,
      senderAccountId: fromAccountId,
      receiverAccountId: toAccountId,
    };
  });

  try {
    await pusher.trigger(`user-${result.senderUser.id}`, "wallet:updated", {
      type: "debit",
      amount,
    });
    await pusher.trigger(`user-${result.receiverUser.id}`, "wallet:updated", {
      type: "credit",
      amount,
    });
  } catch (pusherError: any) {
    console.error("Pusher error:", pusherError.message);
    // don't throw — transfer already succeeded
  }

  return result;
}

export async function verifyReciepient(
  walletAddress: string,
  senderWalletAddress: string,
) {
  const account = await prisma.accounts.findUnique({
    where: { address: walletAddress },
    include: { users: true },
  });

  if (!account || !account.users) throw new Error("Recipient not found");
  if (senderWalletAddress === walletAddress)
    throw new Error("Cannot transfer to self");
  log(
    "Recipient verified: " + account.users.name + " (" + account.address + ")",
  );

  return {
    data: {
      name: account.users.name,
      walletAddress: account.address,
      accountId: account.id,
    },
  };
}
