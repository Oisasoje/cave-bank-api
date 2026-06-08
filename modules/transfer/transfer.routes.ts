import { Router } from "express";
import transferController from "./transfer.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/transfer", requireAuth, transferController);

export default router;
