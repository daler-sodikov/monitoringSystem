import { chat } from "@/lib/groq";

export async function POST(request) {
  try {
    const { count, subject, level, difficulty, description, language = "тоҷикӣ", variantCount = 1 } = await request.json();

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
    ${level ? `барои сатҳи ${level}` : ""} 
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

    const response = await chat(prompt);
    console.log(response)

    const jsonStart = response.indexOf("{");
    const jsonEnd = response.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      return Response.json(
        { error: "Failed to generate valid JSON from AI" },
        { status: 500 },
      );
    }

    const jsonContent = response.slice(jsonStart, jsonEnd);
    let generatedData;
    try {
      generatedData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.log("JSON parse error, attempting to fix...");

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
        generatedData = JSON.parse(fixedJson);
      } catch (retryError) {
        return Response.json(
          { error: `Failed to parse JSON: ${retryError.message}` },
          { status: 500 },
        );
      }
    }

    return Response.json({ success: true, ...generatedData });
  } catch (error) {
    console.error("Groq API error:", error);
    return Response.json(
      {
        error: error.message || "Failed to generate test",
      },
      { status: 500 },
    );
  }
}
