import express from "express";
import cors from "cors";
import { config } from "./config";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/error.middleware";

export function createApp() {
    const app = express();

    // CORS
    app.use(cors(config.cors));

    // Body parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging
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

    app.get("/api/health", (req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || "development",
            version: "1.0.0",
            uptime: process.uptime(),
        });
    });

    // API routes
    app.use("/api", apiRouter);

    // Error handling
    app.use(errorHandler);

    return app;
}