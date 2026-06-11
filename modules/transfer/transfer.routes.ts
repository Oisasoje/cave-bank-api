import { Router } from "express";
import {
  transferController,
  verifyReciepientController,
} from "./transfer.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/initiate", requireAuth, transferController);
router.post("/getReciepient", requireAuth, verifyReciepientController);

export default router;
