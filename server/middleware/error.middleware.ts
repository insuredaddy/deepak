import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = "AppError";
    }
}

export const errorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error("ERROR:", err);

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let details = err.details;

    // Handle specific error types
    if (err.message.includes("timeout")) {
        statusCode = 408;
        message = "Request timeout";
    } else if (err.message.includes("API_KEY") || err.message.includes("not configured")) {
        statusCode = 500;
        message = "Server configuration error";
    } else if (err.message.includes("quota") || err.message.includes("429")) {
        statusCode = 429;
        message = "API quota exceeded";
    }

    res.status(statusCode).json({
        error: message,
        details: config.nodeEnv === "development" ? details || err.stack : undefined,
    });
};
