import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initSocket } from "./socket";
import commentsRouter from "./comments";

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Initialize Socket.io
initSocket(httpServer);

// Routes
app.use("/comments", commentsRouter);

app.get("/", (req, res) => {
  res.send("Collab Docs API Running");
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
