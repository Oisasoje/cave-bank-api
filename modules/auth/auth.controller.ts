import { log, span, error } from "@oisasoje/gloo";
import { getSession, logoutUser, startAuth, verifyAuth } from "./auth.service.js";
import { startSchema, verifySchema } from "./auth.schema.js";
import { Request, Response } from "express";

const isProd = process.env.NODE_ENV === "production";

export async function start(req: Request, res: Response) {
  const result = startSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { phone } = result.data;

    const attempt = await startAuth(phone);

    return res.status(200).send({ data: { id: attempt.id } });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
}

export async function verify(req: Request, res: Response) {
  const result = verifySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }
  try {
    const { id, pin } = result.data;

    const { user, session } = await verifyAuth(id, pin);

    let { pin_hash, id: userId, is_admin, name, ..._ } = user;

    // Set the sessionId cookie for session authentication
    res.cookie("sessionId", session.id, {
      httpOnly: true,
      path: "/",
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      message: "Login successful!",
      data: {
        user: {
          id: userId,
          name,
          isAdmin: is_admin,
        },
      },
    });
  } catch (err: any) {
    error(err);
    return res.status(401).json({ message: err.message });
  }
}

export async function me(req: any, res: any) {
  log("Retrieving session data");
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const session = await span("getSession operation", () =>
    getSession(sessionId),
  );

  if (!session) {
    return res.status(401).json({ message: "Authentication required." });
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
