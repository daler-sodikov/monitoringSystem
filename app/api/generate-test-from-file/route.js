import {
  chatCompletionStream,
  parseGeneratedJson,
  enforceQuestionCounts,
} from "@/lib/kimi";
import { extractTextFromFile } from "@/lib/extract-text";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ
const MAX_TEXT_CHARS = 20000; // то ҳудуди контексти модел

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json(
        { error: "Лутфан файлро бор кунед" },
        { status: 400 },
      );
    }

    const fileName = file.name || "";
    if (!/\.(pdf|docx)$/i.test(fileName)) {
      return Response.json(
        { error: "Танҳо файлҳои PDF ва Word (DOCX) дастгирӣ мешаванд" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Андозаи файл набояд аз 10 МБ зиёд бошад" },
        { status: 400 },
      );
    }

    const count = Math.min(
      10,
      Math.max(1, parseInt(formData.get("count")) || 1),
    );
    const variantCount = Math.min(
      10,
      Math.max(1, parseInt(formData.get("variantCount")) || 1),
    );
    const subject = String(formData.get("subject") || "");
    const level = String(formData.get("level") || "");
    const difficulty = String(formData.get("difficulty") || "");
    const description = String(formData.get("description") || "");
    const language = String(formData.get("language") || "тоҷикӣ");

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText;
    try {
      extractedText = await extractTextFromFile(buffer, fileName);
    } catch (extractError) {
      return Response.json(
        { error: "Хатогӣ ҳангоми хондани файл: " + extractError.message },
        { status: 400 },
      );
    }

    if (!extractedText.trim()) {
      return Response.json(
        { error: "Аз файли додашуда матн ёфт нашуд" },
        { status: 400 },
      );
    }

    const truncated = extractedText.length > MAX_TEXT_CHARS;
    const text = extractedText.slice(0, MAX_TEXT_CHARS);

    const prompt = `Дар асоси матни ҳуҷҷати боркардашуда ${variantCount} варианти тест бисоз, ки ҳар кадомаш дорои ${count} савол аст.
    ${subject ? `Мавзӯи умумӣ: "${subject}"` : ""}
    ${level ? `барои сатҳи ${level}` : ""}
    ${difficulty ? `бо дараҷаи душвории ${difficulty}` : ""}
    ${description ? `Дастури махсуси корбар: "${description}". Ин дастурро ҳатман риоя кун. Агар корбар саҳифаҳои муайянро номбар карда бошад (масалан "аз саҳифаи 5 то 10"), донистанӣ лозим, ки матни ҳуҷҷат бо нишонаҳои "--- Саҳифаи N ---" ҷудо шудааст ва саволҳоро танҳо аз ҳамон саҳифаҳо гир.` : ""}

    Забони саволҳо ва ҷавобҳо: ${language}

    Матни ҳуҷҷат:
    """
    ${text}
    """
    ${truncated ? "(Эзоҳ: ҳуҷҷат хеле дароз аст, танҳо қисмати аввали он оварда шудааст)" : ""}

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

    Эзоҳ: Танҳо JSON фиристед, бе матни иловагӣ. JSON бояд дуруст бошад. Саволҳо ва ҷавобҳо бояд бо забони ${language} бошанд ва танҳо аз матни ҳуҷҷати додашуда асосёфта бошанд.`;

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
