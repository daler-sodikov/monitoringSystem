import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function chat(prompt, model = "z-ai/glm-4.5-air:free") {
  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model,
  });
  return response.choices[0]?.message?.content || "";
}

async function chatCompletion(
  messages,
  model = "google/gemini-2.0-flash-001:free",
  { temperature = 1, maxCompletionTokens = 4096, top_p = 1, stop = null } = {},
) {
  const response = await openai.chat.completions.create({
    messages,
    model,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    top_p: top_p,
    stream: false,
    stop,
  });
  return response.choices[0]?.message?.content || "";
}

async function chatCompletionStream(
  messages,
  model = "google/gemini-2.0-flash-001:free",
  { temperature = 1, maxCompletionTokens = 4096, top_p = 1, stop = null } = {},
) {
  const response = await openai.chat.completions.create({
    messages,
    model,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    top_p: top_p,
    stream: true,
    stop,
  });
  return response;
}

export { chat, chatCompletion, chatCompletionStream };
