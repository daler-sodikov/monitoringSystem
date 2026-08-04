import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Матнро аз файли PDF ё DOCX мебарорад.
// Барои PDF матн бо нишонаҳои "--- Саҳифаи N ---" ҷудо мешавад,
// то AI тавонад дастурҳои корбарро (масалан "аз саҳифаи 5 то 10") иҷро кунад.
export async function extractTextFromFile(buffer, fileName) {
  const lower = (fileName || "").toLowerCase();

  if (lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      if (result.pages?.length) {
        return result.pages
          .map((page) => `--- Саҳифаи ${page.num} ---\n${page.text}`)
          .join("\n\n");
      }
      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  throw new Error("Навъи файл дастгирӣ намешавад (танҳо PDF ва DOCX)");
}
