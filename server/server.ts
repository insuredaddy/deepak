import { createServer } from "http";
import { createApp } from "./app";
import { config } from "./config";

async function start() {
    const app = createApp();
    const server = createServer(app);

    server.listen(config.port, "127.0.0.1", () => {
        console.log(`🚀 Server running on http://localhost:${config.port}`);
        console.log(`📝 Environment: ${config.nodeEnv}`);
        console.log(`🤖 AI Provider: ${config.ai.provider}`);
    });
}

start().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
});
