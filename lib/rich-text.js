// Tiptap ҳосил кардаи HTML-ро барои намоиш (студент/натиҷаҳо) ва экспорт (PDF/Word) коркард мекунад.
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "code",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "hr",
];

export function sanitizeHtml(html) {
  if (!html) return "";
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS });
}

export function stripHtml(html) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const container = document.createElement("div");
  container.innerHTML = sanitizeHtml(html);
  container.querySelectorAll("p, li, br, h2, h3, blockquote, hr").forEach((el) => {
    el.insertAdjacentText("afterend", "\n");
  });
  return container.textContent.replace(/\n{2,}/g, "\n").trim();
}
