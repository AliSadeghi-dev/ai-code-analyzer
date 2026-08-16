import { createGroq } from "@ai-sdk/groq";

/**
 * Shared Groq LLM for chat, report generation, and file explain.
 * Free tier is much higher than Gemini free quota for this MVP.
 *
 * Structured outputs (`generateObject` / json_schema) only work on a subset
 * of Groq models — see https://console.groq.com/docs/structured-outputs
 */
function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys",
    );
  }
  return createGroq({ apiKey });
}

/** Chat / explain — any Groq chat model. */
export function getLanguageModel() {
  const groq = createGroqClient();
  const modelId = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  return groq(modelId);
}

/** Health report — must support Groq Structured Outputs. */
export function getStructuredLanguageModel() {
  const groq = createGroqClient();
  const modelId =
    process.env.GROQ_STRUCTURED_MODEL ?? "openai/gpt-oss-120b";
  return groq(modelId);
}
