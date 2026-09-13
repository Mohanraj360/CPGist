import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_AI_MODEL = "gemini-1.5-flash";

export function getAiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI provider is not configured");
  }

  const modelName = process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const client = new GoogleGenerativeAI(apiKey);

  return { client, modelName };
}
