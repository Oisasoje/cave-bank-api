import { prisma } from "../../lib/prisma.js";
import verifyPin from "../../utils/password.js";
import crypto from "crypto";
import { log, span } from "@oisasoje/gloo";
import {
  generateResetPasswordOTP,
  generateSignupOTP,
} from "../../services/GenerateOTP.js";
import { sendOTP, sendPasswordResetOTP } from "../../services/EmailService.js";
import argon2 from "argon2";
import { validateAndCreateWalletAddress } from "../../utils/validateAndCreateWalletAddress.js";

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

  log(`User found for phone ${phone}: ${userEmail} (${userName})`);

  const attempt = await span("j", () =>
    prisma.signup_attempts.create({
      data: {
        phone,
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
      },
    }),
  );

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

    throw new Error("Invalid OTP");
  }
  if (otpMatch.expires_at < new Date()) {
    await prisma.signup_attempts.delete({ where: { id } });
    await prisma.signup_otps.delete({ where: { email: user.email } });

    throw new Error("OTP has expired");
  }

  await prisma.signup_attempts.delete({ where: { id } });
  await prisma.signup_otps.delete({ where: { email: user.email } });

  const setupToken = await prisma.signup_setup_tokens.create({
    data: {
      userId: user.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 15),
    },
  });

  return { setupToken: setupToken.id };
}

export async function resendAuthOTP(id: string) {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new Error("Something unexpected occurred. Try again later.");
  const { email, name } = user;
  const otp = await generateSignupOTP(email);

  await sendOTP(email, name, otp);
}

export async function signupCreatePin(setupToken: string, pin: string) {
  const token = await prisma.signup_setup_tokens.findUnique({
    where: { id: setupToken },
    include: { users: true },
  });

  if (!token) throw new Error("Invalid or expired setup token.");
  if (token.used) throw new Error("Setup token has already been used.");
  if (token.expires_at < new Date()) {
    await prisma.signup_setup_tokens.delete({ where: { id: setupToken } });
    throw new Error("Setup token has expired. Please try again.");
  }

  const hashedPin = await argon2.hash(pin);

  await prisma.users.update({
    where: { id: token.userId },
    data: { pin_hash: hashedPin, is_active: true },
  });

  const result = validateAndCreateWalletAddress(token.users.phone);

  if (!result.success) {
    throw new Error(result.error);
  }

  await createWallet(token.userId, token.users.phone, result.walletAddress);
  await createAccount(token.userId, result.walletAddress);

  await prisma.signup_setup_tokens.delete({ where: { id: setupToken } });

  const session = await createSession(token.userId);
  return { session };
}

async function createWallet(
  userID: string,
  phone: string,
  walletAddress: string,
) {
  await prisma.wallets.create({
    data: { address: walletAddress, owner_user_id: userID },
  });
}

async function createAccount(userID: string, walletAddress: string) {
  await prisma.accounts.create({
    data: { address: walletAddress, owner_id: userID, type: "USER" },
  });
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

  const users = await span("prisma.users.findUnique", () =>
    prisma.users.findUnique({
      where: { id: session.user.id },
      include: { wallets: true },
    }),
  );

  const account = await span("prisma.account.findUnique", () =>
    prisma.accounts.findUnique({
      where: { address: users?.wallets?.address },
    }),
  );

  return {
    session,
    wallet_address: users?.wallets?.address,
    accountId: account?.id,
  };
}

export async function verifyUserPin(userId: string, pin: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found.");
  const targetHash = user.pin_hash || DUMMY_HASH;

  const valid = await verifyPin(targetHash, pin);

  if (!valid) {
    throw new Error("Invalid credentials.");
  }
}

export async function changeUserPin(userId: string, newPin: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found.");

  const newPinHash = await argon2.hash(newPin);

  await prisma.users.update({
    where: { id: userId },
    data: { pin_hash: newPinHash },
  });
}

export async function logoutUser(sessionId: string) {
  await span("prisma.session.deleteMany", () =>
    prisma.session.deleteMany({
      where: { id: sessionId },
    }),
  );
}

export async function resetPinSendOTP(phone: string) {
  const user = await prisma.users.findUnique({ where: { phone } });

  if (!user) throw new Error("No Cave account exists with this number.");

  const userName = user.name;
  const userEmail = user.email;

  const attempt = await prisma.reset_attempts.create({
    data: {
      phone,
      expires_at: new Date(Date.now() + 1000 * 60 * 10),
    },
  });
  const otp = await generateResetPasswordOTP(userEmail);

  await sendPasswordResetOTP(userEmail, userName, otp);

  return { userEmail, attempt };
}

export async function resetPinConfirmOTP(id: string, otp: string) {
  const attempt = await prisma.reset_attempts.findUnique({ where: { id } });
  if (!attempt) throw new Error("Authentication failed.");

  if (attempt.expires_at < new Date()) {
    await prisma.reset_attempts.delete({ where: { id } });
    throw new Error("Authentication attempt has expired.");
  }

  const user = await prisma.users.findUnique({
    where: { phone: attempt.phone },
  });
  if (!user) throw new Error("Something unexpected occurred. Try again later.");

  const otpMatch = await prisma.reset_password_otps.findUnique({
    where: { email: user.email },
  });
  if (!otpMatch) throw new Error("Something went wrong. Try again later.");

  if (otpMatch.expires_at < new Date()) {
    await prisma.reset_attempts.delete({ where: { id } });
    await prisma.reset_password_otps.delete({ where: { email: user.email } });
    throw new Error("OTP has expired");
  }

  if (otpMatch.attempts >= 5) {
    await prisma.reset_attempts.delete({ where: { id } });
    await prisma.reset_password_otps.delete({ where: { email: user.email } });
    throw new Error("Too many attempts. Please try again later.");
  }

  if (otp !== otpMatch.code) {
    await prisma.reset_password_otps.update({
      where: { email: user.email },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Invalid OTP");
  }

  // OTP confirmed — clean up both attempt trackers
  await prisma.reset_attempts.delete({ where: { id } });
  await prisma.reset_password_otps.delete({ where: { email: user.email } });

  // issue a narrow-scoped token for the actual "set new pin" step
  const token = await prisma.password_reset_tokens.create({
    data: {
      userId: user.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  });

  return { resetToken: token.id };
}

export async function setNewPin(resetToken: string, newPin: string) {
  const tokenRecord = await prisma.password_reset_tokens.findUnique({
    where: { id: resetToken },
  });

  if (!tokenRecord) throw new Error("Invalid or expired reset link.");
  if (tokenRecord.used)
    throw new Error("This reset link has already been used.");
  if (tokenRecord.expires_at < new Date()) {
    throw new Error("This reset link has expired.");
  }

  const pin_hash = await argon2.hash(newPin);

  await prisma.$transaction([
    prisma.users.update({
      where: { id: tokenRecord.userId },
      data: { pin_hash },
    }),
    prisma.password_reset_tokens.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    }),
  ]);
}
