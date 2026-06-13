import { prisma } from "../../lib/prisma.js";

export async function getBalance(walletAddress: string) {
  const wallet = await prisma.wallets.findUnique({
    where: { address: walletAddress },
  });

  if (!wallet) throw new Error("Wallet not found");

  return { balance: wallet.balance };
}

export async function getRecentTransactions(accountId: string, limit = 20) {
  const transactions = await prisma.transactions.findMany({
    where: {
      OR: [{ from_account_id: accountId }, { to_account_id: accountId }],
    },
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      accounts_from: {
        include: { users: { select: { name: true } } },
      },
      accounts_to: {
        include: { users: { select: { name: true } } },
      },
    },
  });

  return transactions.map((tx) => ({
    ...tx,
    type: tx.from_account_id === accountId ? "debit" : "credit",
  }));
}
