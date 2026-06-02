import { prisma } from "../../lib/prisma.js";
import verifyPin from "../../utils/password.js";
import crypto from "crypto";
import { log, span } from "@oisasoje/gloo";

const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummyhashdummyhash";

export async function signUpAuth() {}

export async function startAuth(phone: any) {
  const user = await span("prisma.users.findUnique", () =>
    prisma.users.findUnique({
      where: { phone },
    }),
  );

  if (user && !user.is_active) {
    throw new Error("Kindly create your Cave Bank account to proceed");
  }

  if (!user) {
    throw new Error("No Cave account exists with this number");
  }

  const attempt = await prisma.auth_attempt.create({
    data: {
      phone,
      expires_at: new Date(Date.now() + 1000 * 60 * 10),
    },
  });

  return attempt;
}

export async function verifyAuth(id: string, pin: string) {
  const authAttempt = await prisma.auth_attempt.findUnique({
    where: { id },
  });

  if (!authAttempt) throw new Error("Authentication failed");

  if (authAttempt.attempts >= 5) {
    await prisma.auth_attempt.delete({
      where: { id },
    });

    throw new Error("Too many attempts. Please try again later");
  }

  if (authAttempt.expires_at < new Date()) {
    throw new Error("Authentication attempt has expired");
  }

  await prisma.auth_attempt.update({
    where: { id },
    data: { attempts: authAttempt.attempts + 1 },
  });

  const user = await prisma.users.findUnique({
    where: { phone: authAttempt.phone },
  });

  if (!user) throw new Error("Something unexpected occurred. Try again later.");
  const targetHash = user.pin_hash || DUMMY_HASH;

  const valid = await verifyPin(targetHash, pin);

  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const session = await span("prisma.session.create", () =>
    prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    }),
  );

  if (!session) throw new Error("Something went wrong. Try again later.");

  return { user, session };
}

export async function getSession(sessionId: any) {
  const session = await span("prisma.session.findUnique", () =>
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    }),
  );

  if (!session) return null;

  if (session.expires_at < new Date()) {
    await span("prisma.session.deleteMany", () =>
      prisma.session.deleteMany({
        where: { id: session.id },
      }),
    );

    return null;
  }

  return session;
}

export async function logoutUser(sessionId: any) {
  await span("prisma.session.deleteMany", () =>
    prisma.session.deleteMany({
      where: { id: sessionId },
    }),
  );
}
