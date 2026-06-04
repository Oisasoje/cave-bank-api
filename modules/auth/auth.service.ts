import { prisma } from "../../lib/prisma.js";
import verifyPin from "../../utils/password.js";
import crypto from "crypto";
import { log, span } from "@oisasoje/gloo";
import { generateSignupOTP } from "../../services/GenerateOTP.js";
import { sendOTP } from "../../services/EmailService.js";
import argon2 from "argon2";

const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummyhashdummyhash";

export async function signupAuthStart(phone: string) {
  const user = await prisma.users.findUnique({ where: { phone } });
  if (!user) throw new Error("No Cave account exists with this number.");
  if (user.is_active)
    throw new Error(
      "A Cave Bank account is already registered with this number.",
    );
  const userName = user.name;
  const userEmail = user.email;

  const attempt = await prisma.signup_attempts.create({
    data: {
      phone,
      expires_at: new Date(Date.now() + 1000 * 60 * 10),
    },
  });

  const otp = await generateSignupOTP(userEmail);

  await sendOTP(userEmail, userName, otp);

  return { userEmail, attempt };
}

export async function signupAuthOTP(id: string, otp: string) {
  const attempt = await prisma.signup_attempts.findUnique({ where: { id } });

  if (!attempt) throw new Error("Authentication failed.");

  if (attempt.attempts >= 5) {
    await prisma.signup_attempts.delete({ where: { id } });

    throw new Error("Too many attempts. Please try again later.");
  }

  if (attempt.expires_at < new Date()) {
    await prisma.signup_attempts.delete({ where: { id } });

    throw new Error("Authentication attempt has expired.");
  }

  await prisma.signup_attempts.update({
    where: { id },
    data: { attempts: attempt.attempts + 1 },
  });

  const user = await prisma.users.findUnique({
    where: { phone: attempt.phone },
  });

  if (!user) throw new Error("Something unexpected occurred. Try again later.");

  const otpMatch = await prisma.signup_otps.findUnique({
    where: {
      email: user.email,
    },
  });

  if (!otpMatch) throw new Error("Something went wrong. Try again later.");
  if (otp !== otpMatch.code) {
    await prisma.signup_otps.update({
      where: { email: user.email },
      data: { attempts: otpMatch.attempts + 1 },
    });

    throw new Error("Wrong OTP");
  }
  if (otpMatch.expires_at < new Date()) {
    await prisma.signup_attempts.delete({ where: { id } });
    await prisma.signup_otps.delete({ where: { email: user.email } });

    throw new Error("OTP has expired");
  }

  await prisma.signup_attempts.delete({ where: { id } });
  await prisma.signup_otps.delete({ where: { email: user.email } });

  return { user };
}

export async function resendAuthOTP(id: string) {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new Error("Something unexpected occurred. Try again later.");
  const { email, name } = user;
  const otp = await generateSignupOTP(email);

  await sendOTP(email, name, otp);
}

export async function signupCreatePin(userId: string, pin: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("Something unexpected occurred. Try again later.");

  const hashedPin = await argon2.hash(pin);

  await prisma.users.update({
    where: { id: userId },
    data: { pin_hash: hashedPin, is_active: true },
  });

  const {
    pin_hash,
    created_at,
    updated_at,
    is_active,
    deactivated_at,
    ...rest
  } = user;

  const session = await createSession(userId);
  return { session, user: rest };
}

export async function createSession(userId: string) {
  return await span("prisma.session.create", () =>
    prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    }),
  );
}

export async function loginAuthStart(phone: string) {
  const user = await span("prisma.users.findUnique", () =>
    prisma.users.findUnique({
      where: { phone },
    }),
  );

  if (user && !user.is_active) {
    throw new Error("Kindly create your Cave Bank account to proceed.");
  }

  if (!user) {
    throw new Error("No Cave account exists with this number.");
  }

  const attempt = await prisma.login_attempts.create({
    data: {
      phone,
      expires_at: new Date(Date.now() + 1000 * 60 * 10),
    },
  });

  return attempt;
}

export async function loginAuthVerify(id: string, pin: string) {
  const authAttempt = await prisma.login_attempts.findUnique({
    where: { id },
  });

  if (!authAttempt) throw new Error("Authentication failed.");

  if (authAttempt.attempts >= 5) {
    await prisma.login_attempts.delete({
      where: { id },
    });

    throw new Error("Too many attempts. Please try again later.");
  }

  if (authAttempt.expires_at < new Date()) {
    await prisma.login_attempts.delete({
      where: { id },
    });

    throw new Error("Authentication attempt has expired.");
  }

  await prisma.login_attempts.update({
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
    throw new Error("Invalid credentials.");
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

export async function getSession(sessionId: string) {
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

export async function logoutUser(sessionId: string) {
  await span("prisma.session.deleteMany", () =>
    prisma.session.deleteMany({
      where: { id: sessionId },
    }),
  );
}
