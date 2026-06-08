import { prisma } from "../../lib/prisma.js";
import crypto from "crypto";

export default async function transferService({
  fromAccountId,
  toAccountId,
  amount,
  reference,
  reason,
  initiatedById,
}: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reference: string;
  reason?: string;
  initiatedById: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. IDEMPOTENCY CHECK
    const existing = await tx.transactions.findUnique({
      where: { reference },
    });

    if (existing) return existing;

    // 2. VERIFY ACCOUNTS EXIST (no extra logic)
    const [senderAccount, receiverAccount] = await Promise.all([
      tx.accounts.findUnique({ where: { id: fromAccountId } }),
      tx.accounts.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!senderAccount || !receiverAccount) {
      throw new Error("Invalid accounts");
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
        reference,
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
