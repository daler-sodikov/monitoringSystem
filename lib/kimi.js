import OpenAI from "openai";

const client = new OpenAI({
  baseURL:
    "https://dalerjonsodikov27--ep-kimi-k3-project-server.us-west.modal.direct/v1",
  apiKey: "unused",
  defaultHeaders: {
    "Modal-Key": process.env.MODAL_PROXY_TOKEN_ID,
    "Modal-Secret": process.env.MODAL_PROXY_TOKEN_SECRET,
  },
});

const DEFAULT_MODEL = "moonshotai/Kimi-K3";

async function chat(prompt, model = DEFAULT_MODEL) {
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: false,
    reasoning_effort: "none",
  });
  return completion.choices[0]?.message?.content || "";
}

async function chatCompletion(
  messages,
  model = DEFAULT_MODEL,
  {
    temperature = 0.3,
    maxTokens = 2048,
    top_p = 0.95,
    stop = null,
    reasoningEffort = "none",
  } = {},
) {
  const completion = await client.chat.completions.create({
    messages,
    model,
    temperature,
    max_tokens: maxTokens,
    top_p,
    stream: false,
    stop,
    reasoning_effort: reasoningEffort,
  });
  return completion.choices[0]?.message?.content || "";
}

async function chatCompletionStream(
  messages,
  model = DEFAULT_MODEL,
  {
    temperature = 0.3,
    maxTokens = 2048,
    top_p = 0.95,
    stop = null,
    reasoningEffort = "none",
  } = {},
) {
  const stream = await client.chat.completions.create({
    messages,
    model,
    temperature,
    max_tokens: maxTokens,
    top_p,
    stream: true,
    stop,
    reasoning_effort: reasoningEffort,
  });
  return stream;
}

// Матни ҷавоби AI ро тоза мекунад ва JSON мегирад.
// Агар қавсҳо пурра набошанд, кӯшиши ислоҳ мекунад.
function parseGeneratedJson(fullText) {
  const jsonStart = fullText.indexOf("{");
  const jsonEnd = fullText.lastIndexOf("}") + 1;
  if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
    throw new Error("Failed to generate valid JSON from AI");
  }

  const jsonContent = fullText.slice(jsonStart, jsonEnd);
  try {
    return JSON.parse(jsonContent);
  } catch {
    const bracketCount = jsonContent.split("").reduce((acc, char) => {
      if (char === "{") acc++;
      if (char === "}") acc--;
      return acc;
    }, 0);

    let fixedJson = jsonContent;
    for (let i = 0; i < Math.abs(bracketCount); i++) {
      fixedJson += bracketCount > 0 ? "}" : "{";
    }

    try {
      return JSON.parse(fixedJson);
    } catch (retryError) {
      throw new Error(`Failed to parse JSON: ${retryError.message}`);
    }
  }
}

// Модел баъзан аз миқдори дархостшудаи вариант/савол зиёдтар месозад.
// Ин функсия натиҷаро ба миқдори дуруст маҳдуд мекунад.
function enforceQuestionCounts(data, variantCount, count) {
  if (!data || !Array.isArray(data.variants)) return data;
  return {
    ...data,
    variants: data.variants.slice(0, variantCount).map((variant) => ({
      ...variant,
      questions: Array.isArray(variant.questions)
        ? variant.questions.slice(0, count)
        : variant.questions,
    })),
  };
}

export {
  chat,
  chatCompletion,
  chatCompletionStream,
  parseGeneratedJson,
  enforceQuestionCounts,
  DEFAULT_MODEL,
};
