import {
  chatCompletionStream,
  parseGeneratedJson,
} from "@/lib/kimi";

export async function POST(request) {
  try {
    const {
      count,
      subject,
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

    const prompt = `Ту як мутахассиси тартиб додани тестҳои таълимӣ ҳастӣ. Вазифаи ту: сохтани маводи тест бо формати ДАҚИҚИ JSON, бидуни хатогӣ.

ДАРХОСТ:
- Мавзӯъ: "${subject || ""}"
${difficulty ? `- Дараҷаи душворӣ: ${difficulty}` : ""}
${description ? `- Тавсифи иловагӣ: ${description}` : ""}
- Забони саволҳо ва ҷавобҳо: ${language}
- Шумораи вариантҳо: РАВШАН ${variantCount} адад (на камтар, на зиёдтар)
- Шумораи саволҳо дар ҳар варианта: РАВШАН ${count} адад (на камтар, на зиёдтар)

ҚОИДАҲОИ ҲАТМӢ:
1. Ҳар варианта бояд ${count} саволи мустақил ва гуногун дошта бошад — саволҳоро аз варианти дигар такрор накун.
2. Барои навъи MULTIPLE_CHOICE:
   - Майдони "options" бояд аз 2 то 6 объект дошта бошад
   - Ҳар объект бояд майдонҳои "text" (сатр) ва "isCorrect" (true/false) дошта бошад
   - Танҳо 1 ё 2 вариант бояд isCorrect: true дошта бошанд, боқимонда isCorrect: false
   - Майдони "pairs" бояд холӣ [] бошад
3. Барои навъи MATCHING:
   - Майдони "pairs" бояд аз 3 то 6 объект дошта бошад, ҳар кадом бо майдонҳои "left" ва "right"
   - Майдони "options" бояд холӣ [] бошад
4. Барои навъи OPEN:
   - Майдонҳои "options" ва "pairs" бояд ҳарду холӣ [] бошанд
5. Майдони "points" бояд адади бутун байни 1 то 10 бошад (на сатр, на касрӣ)
6. Дар матни саволҳо ва вариантҳо ҳаргиз аз аломати нохунаки дугона (") истифода набар — агар иқтибос лозим шавад, аломати « » -ро истифода бар, вагарна JSON вайрон мешавад
7. Ҳар савол бояд оҳанги табиӣ ва гуногун дошта бошад (на ҳамеша аз як қолаби ҷумла сар шавад)

ФОРМАТИ ҶАВОБ (танҳо ҳамин, дигар ҳеҷ чиз):
- Танҳо як объекти JSON фиристода шавад
- Бе матни изофӣ, бе шарҳ, бе аломати \`\`\`json ё \`\`\`
- Бе вергули изофӣ (trailing comma) дар охири рӯйхатҳо ё объектҳо
- Бе шарҳ дар дохили JSON (// ё /* */ мамнӯъ аст)
- Ҳамаи нохунакҳо бояд дугона " бошанд, на якка '

СОХТОРИ ДАҚИҚИ JSON:
{
  "variants": [
    {
      "name": "Варианти 1",
      "questions": [
        {
          "text": "Матни савол",
          "type": "MULTIPLE_CHOICE",
          "points": 1,
          "options": [
            {"text": "Вариант А", "isCorrect": true},
            {"text": "Вариант Б", "isCorrect": false}
          ],
          "pairs": []
        },
        {
          "text": "Матни мутобиқат",
          "type": "MATCHING",
          "points": 2,
          "options": [],
          "pairs": [
            {"left": "А", "right": "1"},
            {"left": "Б", "right": "2"},
            {"left": "В", "right": "3"}
          ]
        },
        {
          "text": "Матни саволи кушода",
          "type": "OPEN",
          "points": 5,
          "options": [],
          "pairs": []
        }
      ]
    }
  ]
}

Пеш аз ирсол худ санҷед: 1) шумораи вариантҳо ва саволҳо дар ҳар варианта мувофиқи талаб аст, 2) ҳар савол мутобиқи навъаш танҳо майдонҳои дурустро дорад (options ё pairs), 3) JSON комилан дуруст аст — ҳамаи қавс ва вергулҳо дар ҷояшон, вергули изофӣ нест. Танҳо баъд аз ин санҷиш JSON-ро фиристед.`;

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
