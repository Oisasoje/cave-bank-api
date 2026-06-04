import { randomInt } from "crypto";
import { prisma } from "../lib/prisma.js";

export async function generateSignupOTP(email: string) {
  const code = randomInt(100000, 999999).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.signup_otps.upsert({
    where: { email },
    update: { code, expires_at, attempts: 0 },
    create: { email, code, expires_at },
  });

  return code;
}

export async function generateResetPasswordOTP(email: string) {
  const code = randomInt(100000, 999999).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.reset_password_otps.upsert({
    where: { email },
    update: { code, expires_at, attempts: 0 },
    create: { email, code, expires_at },
  });

  return code;
}
