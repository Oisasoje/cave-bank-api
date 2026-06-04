import argon2 from "argon2";

async function verifyPin(hash: any, pin: any) {
  if (!hash) {
    throw new Error("Account incomplete or invalid credentials");
  }
  const valid = await argon2.verify(hash, pin);

  return valid;
}

export default verifyPin;
