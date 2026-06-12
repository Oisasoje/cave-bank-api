import { getSession } from "../modules/auth/auth.service.js";
import { rateLimit } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const sessionId = req.cookies.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await getSession(sessionId);

    if (!result) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { session: sessionData, wallet_address, accountId } = result;

    // 🔥 IMPORTANT: attach user explicitly

    req.auth = {
      session: {
        id: sessionData.id,
        userId: sessionData.userId,
        expires_at: sessionData.expires_at,
      },
      user: sessionData.user,
      wallet_address,
      accountId,
    };

    req.session = req.auth.session;
    req.user = req.auth.user;
    req.walletAddress = req.auth.wallet_address;
    req.accountId = req.auth.accountId;

    next();
  } catch (err) {
    return res.status(500).json({ error: "Auth failure" });
  }
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 105,
  message: {
    message: "Too many login attempts. Try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 105,
  message: {
    message: "Too many signup attempts. Try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
