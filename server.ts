import { httpServer } from "./app.js";

if (process.env.NODE_ENV !== "production") {
  httpServer.listen(8000, () => console.log("Server running on port 8000"));
}

export default httpServer;
