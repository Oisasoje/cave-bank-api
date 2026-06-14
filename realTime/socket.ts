import { Server } from "socket.io";

export let io: Server;

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;

    if (!userId) return;

    socket.join(`user:${userId}`);
  });

  return io;
};
