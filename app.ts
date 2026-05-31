import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import { gloo } from "@oisasoje/gloo";

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use(gloo());
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);

export default app;
