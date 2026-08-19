// Тарҷумаи "нотамом"-и JSON: матни стриминги LLM-ро, ки то ҳол пурра нашудааст,
// ба объекти беҳтарин имконпазир табдил медиҳад (то майдонҳо дар вақти воқеӣ намоиш дода шаванд).
export function parsePartialJson(text) {
  let s = String(text || "").trim();
  s = s.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");

  const start = s.search(/[{[]/);
  if (start === -1) return null;
  s = s.slice(start);

  const n = s.length;
  let i = 0;

  const isWs = (c) => c === " " || c === "\n" || c === "\t" || c === "\r";
  const skipWs = () => {
    while (i < n && isWs(s[i])) i++;
  };

  function parseString() {
    i++; // "
    let value = "";
    while (i < n) {
      const c = s[i];
      if (c === "\\") {
        if (i + 1 >= n) return { incomplete: true, value };
        const next = s[i + 1];
        if (next === "u") {
          const hex = s.slice(i + 2, i + 6);
          if (hex.length < 4) return { incomplete: true, value };
          value += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        const map = {
          n: "\n",
          t: "\t",
          r: "\r",
          b: "\b",
          f: "\f",
          '"': '"',
          "\\": "\\",
          "/": "/",
        };
        value += map[next] !== undefined ? map[next] : next;
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        return { incomplete: false, value };
      }
      value += c;
      i++;
    }
    return { incomplete: true, value };
  }

  function parseLiteralOrNumber() {
    const startI = i;
    while (i < n && /[-+0-9.eEtruefalsn]/.test(s[i])) i++;
    const raw = s.slice(startI, i);
    if (raw === "") return { incomplete: true, value: undefined };
    if (raw === "true") return { incomplete: false, value: true };
    if (raw === "false") return { incomplete: false, value: false };
    if (raw === "null") return { incomplete: false, value: null };
    if ("true".startsWith(raw) || "false".startsWith(raw) || "null".startsWith(raw)) {
      return { incomplete: true, value: undefined };
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return { incomplete: true, value: undefined };
    return { incomplete: i === n, value: num };
  }

  function parseValue() {
    skipWs();
    if (i >= n) return { incomplete: true, value: undefined };
    const c = s[i];
    if (c === '"') return parseString();
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    return parseLiteralOrNumber();
  }

  function parseObject() {
    i++; // {
    const obj = {};
    while (true) {
      skipWs();
      if (i >= n) return { incomplete: true, value: obj };
      if (s[i] === "}") {
        i++;
        return { incomplete: false, value: obj };
      }
      if (s[i] !== '"') return { incomplete: true, value: obj };
      const keyRes = parseString();
      if (keyRes.incomplete) return { incomplete: true, value: obj };
      skipWs();
      if (i >= n || s[i] !== ":") return { incomplete: true, value: obj };
      i++;
      const valRes = parseValue();
      if (valRes.value !== undefined) obj[keyRes.value] = valRes.value;
      if (valRes.incomplete) return { incomplete: true, value: obj };
      skipWs();
      if (i >= n) return { incomplete: true, value: obj };
      if (s[i] === ",") {
        i++;
        continue;
      }
      if (s[i] === "}") {
        i++;
        return { incomplete: false, value: obj };
      }
      return { incomplete: true, value: obj };
    }
  }

  function parseArray() {
    i++; // [
    const arr = [];
    while (true) {
      skipWs();
      if (i >= n) return { incomplete: true, value: arr };
      if (s[i] === "]") {
        i++;
        return { incomplete: false, value: arr };
      }
      const valRes = parseValue();
      if (valRes.value !== undefined) arr.push(valRes.value);
      if (valRes.incomplete) return { incomplete: true, value: arr };
      skipWs();
      if (i >= n) return { incomplete: true, value: arr };
      if (s[i] === ",") {
        i++;
        continue;
      }
      if (s[i] === "]") {
        i++;
        return { incomplete: false, value: arr };
      }
      return { incomplete: true, value: arr };
    }
  }

  return parseValue().value;
}
