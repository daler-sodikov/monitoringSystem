import {
  chatCompletionStream,
  parseGeneratedJson,
  enforceQuestionCounts,
} from "@/lib/kimi";

export async function POST(request) {
  try {
    const {
      count,
      subject,
      level,
      difficulty,
      description,
      language = "тоҷикӣ",
      variantCount = 1,
    } = await request.json();

    if (!count || count < 1 || count > 10) {
      return Response.json(
        { error: "Миқдори саволҳо бояд аз 1 то 10 бошад" },
        { status: 400 },
      );
    }

    if (!variantCount || variantCount < 1 || variantCount > 10) {
      return Response.json(
        { error: "Миқдори вариантҳо бояд аз 1 то 10 бошад" },
        { status: 400 },
      );
    }

    const prompt = `Бисоз ${variantCount} варианти тест, ки ҳар кадомаш дорои ${count} савол аст дар мавзӯи "${subject || ""}"
    ${difficulty ? `бо дараҷаи душвории ${difficulty}` : ""}
    ${description ? `Тавсифи иловагӣ: ${description}` : ""}

    Забони саволҳо ва ҷавобҳо: ${language}

    Шакли дархостшуда барои ҳар як савол:
    - Матни савол
    - Навъ: MULTIPLE_CHOICE (интихоби якчанд), MATCHING (мутобиқат), ё OPEN (кушода)
    - Балл: рақам (1-10)

    Барои MULTIPLE_CHOICE:
    - Рӯйхати вариантҳо бо майдонҳои text ва isCorrect
    - На камтар аз 2 вариант ва на зиёда аз 6 вариант
    - Танҳо 1 ё 2 варианти дуруст

    Барои MATCHING:
    - Рӯйхати ҷуфтҳо бо майдонҳои left ва right
    - Аз 3 то 6 ҷуфт

    Барои OPEN:
    - Бе вариантҳо ва ҷуфтҳо

    Ҷавоб диҳед бо формати JSON дар ин шакл:
    {
      "variants": [{
        "name": "Варианти 1",
        "questions": [{
          "text": "Матни савол?",
          "type": "MULTIPLE_CHOICE",
          "points": 1,
          "options": [{"text": "Вариант А", "isCorrect": true}, ...],
          "pairs": []
        }, {
          "text": "Мутобиқат...",
          "type": "MATCHING",
          "points": 2,
          "options": [],
          "pairs": [{"left": "А", "right": "1"}, ...]
        }, {
          "text": "Саволи кушода?",
          "type": "OPEN",
          "points": 5,
          "options": [],
          "pairs": []
        }]
      }]
    }

    Эзоҳ: Танҳо JSON фиристед, бе матни иловагӣ. JSON бояд дуруст бошад. Саволҳо ва ҷавобҳо бояд бо забони ${language} бошанд.`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        let fullText = "";

        try {
          const completionStream = await chatCompletionStream(
            [{ role: "user", content: prompt }],
            undefined,
            { maxTokens: 8192 },
          );

          for await (const chunk of completionStream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              send({ type: "delta", text: delta });
            }
          }

          let generatedData;
          try {
            generatedData = parseGeneratedJson(fullText);
          } catch (parseError) {
            send({ type: "error", error: parseError.message });
            controller.close();
            return;
          }

          generatedData = enforceQuestionCounts(
            generatedData,
            variantCount,
            count,
          );

          send({ type: "done", success: true, ...generatedData });
          controller.close();
        } catch (streamError) {
          send({
            type: "error",
            error: streamError.message || "Failed to generate test",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Kimi API error:", error);
    return Response.json(
      {
        error: error.message || "Failed to generate test",
      },
      { status: 500 },
    );
  }
}
