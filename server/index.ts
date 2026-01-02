import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const server = createServer(app);

/* ---------------- CORS (CRITICAL) ---------------- */

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

/* ---------------- body parsing ---------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ---------------- API logger ---------------- */

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const ms = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });

  next();
});

/* ---------------- bootstrap ---------------- */

async function start() {
  // API routes only
  await registerRoutes(server, app);

  // error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("API ERROR:", err);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // serve frontend only in production
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 5000;

  server.listen(port, "127.0.0.1", () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("FAILED TO START SERVER:", err);
  process.exit(1);
});
