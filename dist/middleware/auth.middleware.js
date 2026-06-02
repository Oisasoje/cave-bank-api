import { getSession } from "../modules/auth/auth.service.js";
import rateLimit from "express-rate-limit";
export async function requireAuth(req, res, next) {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = session.user;
    next();
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
