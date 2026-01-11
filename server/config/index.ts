import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const config = {
    port: Number(process.env.PORT) || 8080,
    nodeEnv: process.env.NODE_ENV || "development",

    ai: {
        provider: process.env.AI_PROVIDER || "gemini",
        gemini: {
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || "gemini-3-pro-preview",
            temperature: 0,
            timeout: 5 * 60 * 1000, // 5 minutes
        },
        // Future: OpenAI, Claude, etc.
    },

    upload: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "text/plain",
        ],
        uploadDir: "uploads/",
    },

    cors: {
        origins: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    },

    // Future: Database config
    database: {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || "policy_analyzer",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        poolSize: 10,
        enablePgVector: true,
    },
};
