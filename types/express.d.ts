import { AuthContext, SessionRecord } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
      user: AuthContext["user"];
      session: SessionRecord;
      walletAddress: AuthContext["wallet_address"];
    }
  }
}

export {};
