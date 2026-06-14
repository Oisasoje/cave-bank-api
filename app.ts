// app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./modules/auth/auth.routes.js";
import { gloo } from "@oisasoje/gloo";
import transferRoutes from "./modules/transfer/transfer.routes.js";
import userRoutes from "./modules/user/user.routes.js";

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);
  const userId = socket.handshake.auth.userId;
  if (!userId) return;
  socket.join(`user:${userId}`);
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(gloo());
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/transfer", transferRoutes);
app.use("/user", userRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export { httpServer };
export default app;
