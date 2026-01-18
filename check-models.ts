import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("NO API KEY FOUND");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("Listing available models...\n");

  const models = await genAI.listModels();

  for (const model of models) {
    console.log(
      model.name,
      "→",
      model.supportedGenerationMethods
    );
  }
}

run().catch((err) => {
  console.error("ERROR:", err);
});
