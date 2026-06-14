import { prisma } from "../../lib/prisma.js";

export async function getBalance(walletAddress: string) {
  const wallet = await prisma.wallets.findUnique({
    where: { address: walletAddress },
  });

  if (!wallet) throw new Error("Wallet not found");

  return { balance: wallet.balance };
}

export async function getTransactions(
  accountId: string,
  limit = 20,
  cursor?: string,
) {
  const transactions = await prisma.transactions.findMany({
    where: {
      OR: [{ from_account_id: accountId }, { to_account_id: accountId }],
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      accounts_from: {
        include: { users: { select: { name: true } } },
      },
      accounts_to: {
        include: { users: { select: { name: true } } },
      },
    },
  });

  const hasNextPage = transactions.length > limit;
  if (hasNextPage) transactions.pop();

  return {
    data: transactions.map((tx) => ({
      ...tx,
      type: tx.from_account_id === accountId ? "debit" : "credit",
    })),
    hasNextPage,
    nextCursor: hasNextPage ? transactions[transactions.length - 1].id : null,
  };
}
