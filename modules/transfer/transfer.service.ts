import { prisma } from "../../lib/prisma.js";

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
  return prisma.$transaction(async (tx: any) => {
    // STEP 1: idempotency check
    const existing = await tx.transactions.findUnique({
      where: { reference },
    });

    if (existing) return existing;

    // STEP 2: lock sender account
    const sender = await tx.accounts.findUnique({
      where: { id: fromAccountId },
    });

    const receiver = await tx.accounts.findUnique({
      where: { id: toAccountId },
    });

    if (!sender || !receiver) throw new Error("Invalid accounts");

    // STEP 3: balance check
    if (sender.balance < amount) {
      throw new Error("Insufficient funds");
    }

    // STEP 4: create transaction
    const transaction = await tx.transactions.create({
      data: {
        id: crypto.randomUUID(),
        amount,
        reference,
        reason,
        initiated_by_id: initiatedById,
        from_address: fromAccountId,
        to_address: toAccountId,
      },
    });

    // STEP 5: ledger entries
    await tx.ledger_entries.create({
      data: {
        id: crypto.randomUUID(),
        transaction_id: transaction.id,
        account_id: fromAccountId,
        debit: amount,
        credit: 0,
      },
    });

    await tx.ledger_entries.create({
      data: {
        id: crypto.randomUUID(),
        transaction_id: transaction.id,
        account_id: toAccountId,
        debit: 0,
        credit: amount,
      },
    });

    // STEP 6: update balances
    await tx.accounts.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    });

    await tx.accounts.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    });

    return transaction;
  });
}
