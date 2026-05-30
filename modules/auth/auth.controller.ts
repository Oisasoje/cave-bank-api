import { log, span, error } from "@oisasoje/gloo";
import { getSession, logoutUser, startAuth, verifyAuth } from "./auth.service";
import { loginSchema, startSchema, verifySchema } from "./auth.schema";
import { Request, Response } from "express";

export async function start(req: Request, res: Response) {
  const result = startSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }

  try {
    const { phone } = result.data;

    const attempt = await startAuth(phone);

    return res
      .status(200)
      .send({ data: { id: attempt.id, phone_number: attempt.phone } });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function verify(req: Request, res: Response) {
  const result = verifySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }
  try {
    const { id, pin } = result.data;

    log(id);
    log(pin);

    const { user, session } = await verifyAuth(id, pin);

    let { pin_hash, id: userId, is_admin, ...userWithoutPin } = user;

    res.json({
      message: "Login successful!",
      data: { user: { id: userId, isAdmin: is_admin }, session },
    });
  } catch (err: any) {
    error(err);
    return res.status(401).json({ error: err.message });
  }
}

export async function me(req: any, res: any) {
  log("Retrieving session data");
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = await span("getSession operation", () =>
    getSession(sessionId),
  );

  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const { pin_hash, ...userWithoutPin } = session.user;

  return res.json({
    user: userWithoutPin,
  });
}

export async function logout(req: any, res: any) {
  log("Logging out user");
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    await span("logoutUser operation", () => logoutUser(sessionId));
  }

  res.clearCookie("sessionId");
  return res.json({ message: "Logout successful" });
}
