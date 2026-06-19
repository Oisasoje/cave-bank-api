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

export async function getTransactionById(transactionId: string) {
  const transaction = await prisma.transactions.findUnique({
    where: { id: transactionId },
    include: {
      accounts_from: {
        include: { users: { select: { name: true } } },
      },
      accounts_to: {
        include: { users: { select: { name: true } } },
      },
    },
  });
  if (!transaction) throw new Error("Transaction not found");
  return transaction;
}

export async function addFavoriteContacts(
  userId: string,
  favoriteUserIds: string[],
) {
  const uniqueIds = [...new Set(favoriteUserIds)];

  if (uniqueIds.includes(userId)) {
    throw new Error("Cannot favorite yourself");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user_favorites.findMany({
      where: {
        user_id: userId,
        favorite_id: { in: uniqueIds },
      },
      select: { favorite_id: true },
    });

    if (existing.length > 0) {
      throw new Error(
        `Already in favorites: ${existing.map((e) => e.favorite_id).join(", ")}`,
      );
    }

    const existingCount = await tx.user_favorites.count({
      where: { user_id: userId },
    });

    if (existingCount + uniqueIds.length > 5) {
      throw new Error("Maximum number of favorite contacts reached");
    }

    const interactions = await tx.transactions.findMany({
      where: {
        OR: uniqueIds.flatMap((id) => [
          {
            wallets_transactions_from_addressTowallets: {
              users: { id: userId },
            },
            wallets_transactions_to_addressTowallets: { users: { id } },
          },
          {
            wallets_transactions_from_addressTowallets: { users: { id } },
            wallets_transactions_to_addressTowallets: { users: { id: userId } },
          },
        ]),
      },
      select: {
        wallets_transactions_from_addressTowallets: {
          select: { owner_user_id: true },
        },
        wallets_transactions_to_addressTowallets: {
          select: { owner_user_id: true },
        },
      },
    });

    const interactedWith = new Set<string>();
    for (const t of interactions) {
      const from = t.wallets_transactions_from_addressTowallets.owner_user_id;
      const to = t.wallets_transactions_to_addressTowallets.owner_user_id;
      if (from === userId && to) interactedWith.add(to);
      if (to === userId && from) interactedWith.add(from);
    }

    const notInteracted = uniqueIds.filter((id) => !interactedWith.has(id));
    if (notInteracted.length > 0) {
      throw new Error("You can only favorite users you have transacted with");
    }

    await tx.user_favorites.createMany({
      data: uniqueIds.map((id) => ({ user_id: userId, favorite_id: id })),
    });

    return uniqueIds;
  });
}

export async function getFavoriteContacts(userId: string) {
  const favorites = await prisma.user_favorites.findMany({
    where: {
      user_id: userId,
    },
    orderBy: {
      created_at: "asc",
    },
    select: {
      created_at: true,
      favorite: {
        select: {
          id: true,
          name: true,
          wallets: {
            select: {
              address: true,
            },
          },
        },
      },
    },
  });

  return favorites.map((fav) => ({
    id: fav.favorite.id,
    name: fav.favorite.name,
    walletAddress: fav.favorite.wallets?.address ?? null,
    pinnedAt: fav.created_at,
  }));
}

export async function getRecentCounterparties(userId: string, limit = 10) {
  const transactions = await prisma.transactions.findMany({
    where: {
      OR: [
        {
          wallets_transactions_from_addressTowallets: {
            users: { id: userId },
          },
        },
        {
          wallets_transactions_to_addressTowallets: {
            users: { id: userId },
          },
        },
      ],
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    include: {
      wallets_transactions_from_addressTowallets: {
        include: {
          users: { select: { id: true, name: true } },
        },
      },
      wallets_transactions_to_addressTowallets: {
        include: {
          users: { select: { id: true, name: true } },
        },
      },
    },
  });

  const map = new Map<
    string,
    {
      accountId: string;
      displayName: string;
      displayAddress: string | null;
      lastInteractionAt: Date;
      direction: "sent" | "received";
    }
  >();

  for (const tx of transactions) {
    const fromUser = tx.wallets_transactions_from_addressTowallets?.users;
    const toUser = tx.wallets_transactions_to_addressTowallets?.users;

    if (!fromUser || !toUser) continue;

    const isSender = fromUser.id === userId;

    const counterpartyUser = isSender ? toUser : fromUser;
    const counterpartyWallet = isSender
      ? tx.wallets_transactions_to_addressTowallets
      : tx.wallets_transactions_from_addressTowallets;

    const key = counterpartyUser.id;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        accountId: key,
        displayName: counterpartyUser.name,
        displayAddress: counterpartyWallet?.address ?? null,
        lastInteractionAt: tx.created_at,
        direction: isSender ? "sent" : "received",
      });
    }
  }

  return Array.from(map.values())
    .sort(
      (a, b) => b.lastInteractionAt.getTime() - a.lastInteractionAt.getTime(),
    )
    .slice(0, limit);
}
