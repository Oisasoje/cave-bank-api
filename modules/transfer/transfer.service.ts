import { prisma } from "../../lib/prisma.js";
import crypto from "crypto";
import verifyPin from "../../utils/password.js";

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
  return prisma.$transaction(async (tx) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }
    const [senderAccount, receiverAccount] = await Promise.all([
      tx.accounts.findUnique({ where: { id: fromAccountId } }),
      tx.accounts.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!senderAccount) {
      throw new Error("Invalid sender account");
    }

    if (!receiverAccount) {
      throw new Error("Invalid recipient account");
    }

    if (fromAccountId === toAccountId) {
      throw new Error("Cannot transfer to same account");
    }

    // 2. AUTHORIZATION (PIN CHECK)
    if (!senderAccount.owner_id) {
      throw new Error("Account has no owner");
    }
    const senderUser = await tx.users.findUnique({
      where: { id: senderAccount.owner_id },
    });

    if (!senderUser) {
      throw new Error("User not found");
    }

    const hashedPin = senderUser.pin_hash;

    if (!hashedPin) {
      throw new Error("PIN not set up");
    }

    if (senderAccount.owner_id !== initiatedById) {
      throw new Error("Unauthorized");
    }

    const validPin = await verifyPin(hashedPin, pin);

    if (!validPin) {
      throw new Error("Invalid PIN");
    }

    // 3. ATOMIC DEBIT (single source of truth for balance safety)
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

    // 4. CREDIT (no need to pre-read wallet)
    await tx.wallets.update({
      where: { address: receiverAccount.address },
      data: {
        balance: { increment: amount },
      },
    });

    // 5. TRANSACTION RECORD (audit/event layer)
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

    // 6. LEDGER (truth layer)
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

    return transaction;
  });
}

export async function verifyReciepient(walletAddress: string) {
  const account = await prisma.accounts.findUnique({
    where: { address: walletAddress },
    include: { users: true },
  });

  if (!account || !account.users) throw new Error("Recipient not found");

  return {
    data: {
      name: account.users.name,
      walletAddress: account.address,
      accountId: account.id,
    },
  };
}
