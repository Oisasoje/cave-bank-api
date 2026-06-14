import { io } from "../app.js";

export const emitToUser = (userId: string, event: string, payload: any) => {
  io.to(`user:${userId}`).emit(event, payload);
};
