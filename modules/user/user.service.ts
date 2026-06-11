import { prisma } from "../../lib/prisma.js";

export async function getBalance(walletAddress: string) {
  const wallet = await prisma.wallets.findUnique({
    where: { address: walletAddress },
  });

  if (!wallet) throw new Error("Wallet not found");

  return { balance: wallet.balance };
}
