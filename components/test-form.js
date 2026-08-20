"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
  Signal,
  Wifi,
  WifiOff,
  Upload,
  FileText,
  FileDown,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { parsePartialJson } from "@/lib/partial-json";
import { stripHtml } from "@/lib/rich-text";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import jsPDF from "jspdf";

// NDJSON streamро мехонад: har қатор як воқеа (delta | done | error)
async function readGenerationStream(res, onDelta) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneData = null;
  let streamError = null;

  const handleLine = (line) => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "delta") {
      onDelta(event.text);
    } else if (event.type === "done") {
      doneData = event;
    } else if (event.type === "error") {
      streamError = event.error;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(handleLine);
  }
  handleLine(buffer);

  return { doneData, streamError };
}

let cyrillicFontBase64Cache = null;

// Ҳуруферо аз /public/fonts бор карда, ба base64 барои jsPDF мубаддал мекунад
async function getCyrillicFontBase64() {
  if (cyrillicFontBase64Cache) return cyrillicFontBase64Cache;

  const res = await fetch("/fonts/NotoSans-Regular.ttf");
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  cyrillicFontBase64Cache = btoa(binary);
  return cyrillicFontBase64Cache;
}

const DEFAULT_TEST_DATA = {
  title: "",
  description: "",
  variants: [
    {
      name: "Варианти 1",
      questions: [],
    },
  ],
};

function normalizeInitialTest(test) {
  return {
    title: test.title || "",
    description: test.description || "",
    variants:
      test.variants && test.variants.length > 0
        ? test.variants.map((v, vi) => ({
            name: v.name || `Варианти ${vi + 1}`,
            questions: (v.questions || []).map((q) => ({
              text: q.text || "",
              type: q.type || "MULTIPLE_CHOICE",
              points: q.points ?? 1,
              options:
                q.options?.map((o) => ({
                  text: o.text || "",
                  isCorrect: !!o.isCorrect,
                })) || [],
              pairs:
                q.pairs?.map((p) => ({
                  left: p.left || "",
                  right: p.right || "",
                })) || [],
            })),
          }))
        : [{ name: "Варианти 1", questions: [] }],
  };
}

export function TestForm({
  initialTest = null,
  pageTitle = "Сохтани тести нав",
  pageDescription = "Тести худро бо якчанд вариант ва саволҳо созед",
  submitLabel = "Сохтани тест",
  submittingLabel = "Сохта истодааст...",
  onSubmit,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  // Ҳуҷҷат боркунӣ: файл ва дастури иловагии корбар
  const [aiFile, setAiFile] = useState(null);
  const [fileDescription, setFileDescription] = useState("");

  const [diagnostics, setDiagnostics] = useState(null);
  const [testData, setTestData] = useState(() =>
    initialTest ? normalizeInitialTest(initialTest) : DEFAULT_TEST_DATA,
  );
  const [aiConfig, setAiConfig] = useState({
    count: 1,
    subject: "",
    level: "",
    difficulty: "",
    description: "",
    language: "тоҷикӣ",
    variantCount: 1,
  });

  // Generatsiya paytida sahifani yangilashdan ogohlantirish
  useEffect(() => {
    if (!aiLoading) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [aiLoading]);

  // Generatsiya paytida sahifa avtomatik pastga scroll bo'lib boradi
  const variantsEndRef = useRef(null);
  useEffect(() => {
    if (!aiLoading) return;
    variantsEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [aiLoading, testData]);

  // Ҳангоми стриминг: майдонҳои нотамомро ба шакли бехатар барои форма меорад
  function normalizePartialVariants(rawVariants) {
    if (!Array.isArray(rawVariants)) return [];
    return rawVariants.map((v, vi) => ({
      name: v?.name || `Варианти ${vi + 1}`,
      questions: Array.isArray(v?.questions)
        ? v.questions.map((q) => ({
            text: q?.text ?? "",
            type: q?.type || "MULTIPLE_CHOICE",
            points: q?.points ?? 1,
            options: Array.isArray(q?.options)
              ? q.options.map((o) => ({
                  text: o?.text ?? "",
                  isCorrect: !!o?.isCorrect,
                }))
              : [],
            pairs: Array.isArray(q?.pairs)
              ? q.pairs.map((p) => ({
                  left: p?.left ?? "",
                  right: p?.right ?? "",
                }))
              : [],
          }))
        : [],
    }));
  }

  async function runDiagnostics() {
    const diag = {
      online: navigator.onLine,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    try {
      const start = Date.now();
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      diag.serverReachability = res.ok;
      diag.latency = Date.now() - start;
    } catch (e) {
      diag.serverReachability = false;
      diag.error = e.message;
    }
    setDiagnostics(diag);
  }

  async function generateTest() {
    if (!aiConfig.subject) {
      toast.error("Лутфан номи мавзӯъро ворид кунед");
      return;
    }

    setAiLoading(true);
    setTestData((prev) => ({
      ...prev,
      variants: [{ name: "Варианти 1", questions: [] }],
    }));

    try {
      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: parseInt(aiConfig.count) || 1,
          subject: aiConfig.subject,
          level: aiConfig.level,
          difficulty: aiConfig.difficulty,
          description: aiConfig.description,
          language: aiConfig.language,
          variantCount: parseInt(aiConfig.variantCount) || 1,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Хатогӣ ҳангоми тавлиди савол");
        return;
      }

      let accumulated = "";
      const { doneData, streamError } = await readGenerationStream(
        res,
        (delta) => {
          accumulated += delta;
          const partial = parsePartialJson(accumulated);
          if (partial?.variants) {
            setTestData((prev) => ({
              ...prev,
              title: prev.title || aiConfig.subject,
              variants: normalizePartialVariants(partial.variants),
            }));
          }
        },
      );

      if (streamError) {
        toast.error(streamError);
        return;
      }

      if (doneData?.variants) {
        setTestData((prev) => ({
          ...prev,
          title: prev.title || aiConfig.subject,
          variants: normalizePartialVariants(doneData.variants),
        }));
        toast.success("Саволҳо бо ёрии AI бомуваффақият сохта шуданд!");
      } else {
        toast.error("Хатогӣ ҳангоми тавлиди савол");
      }
    } catch (error) {
      toast.error("Хатогӣ рӯй дод: " + error.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function generateTestFromFile() {
    if (!aiFile) {
      toast.error("Лутфан аввал файлро интихоб кунед");
      return;
    }

    setAiLoading(true);
    setTestData((prev) => ({
      ...prev,
      variants: [{ name: "Варианти 1", questions: [] }],
    }));

    try {
      const formData = new FormData();
      formData.append("file", aiFile);
      formData.append("count", String(parseInt(aiConfig.count) || 1));
      formData.append(
        "variantCount",
        String(parseInt(aiConfig.variantCount) || 1),
      );
      formData.append("subject", aiConfig.subject);
      formData.append("level", aiConfig.level);
      formData.append("difficulty", aiConfig.difficulty);
      formData.append("language", aiConfig.language);
      formData.append("description", fileDescription);

      const res = await fetch("/api/generate-test-from-file", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Хатогӣ ҳангоми коркарди файл");
        return;
      }

      const fileTitle = aiFile.name.replace(/\.[^.]+$/, "");
      let accumulated = "";
      const { doneData, streamError } = await readGenerationStream(
        res,
        (delta) => {
          accumulated += delta;
          const partial = parsePartialJson(accumulated);
          if (partial?.variants) {
            setTestData((prev) => ({
              ...prev,
              title: prev.title || fileTitle,
              variants: normalizePartialVariants(partial.variants),
            }));
          }
        },
      );

      if (streamError) {
        toast.error(streamError);
        return;
      }

      if (doneData?.variants) {
        setTestData((prev) => ({
          ...prev,
          title: prev.title || fileTitle,
          variants: normalizePartialVariants(doneData.variants),
        }));
        toast.success("Саволҳо аз ҳуҷҷат бомуваффақият сохта шуданд!");
      } else {
        toast.error("Хатогӣ ҳангоми тавлиди савол");
      }
    } catch (error) {
      toast.error("Хатогӣ рӯй дод: " + error.message);
    } finally {
      setAiLoading(false);
    }
  }

  function addVariant() {
    setTestData({
      ...testData,
      variants: [
        ...testData.variants,
        { name: `Варианти ${testData.variants.length + 1}`, questions: [] },
      ],
    });
  }

  function removeVariant(variantIndex) {
    const newVariants = testData.variants.filter((_, i) => i !== variantIndex);
    setTestData({ ...testData, variants: newVariants });
  }

  function addQuestion(variantIndex) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions.push({
      text: "",
      type: "MULTIPLE_CHOICE",
      points: 1,
      options: [{ text: "", isCorrect: false }],
      pairs: [],
    });
    setTestData({ ...testData, variants: newVariants });
  }

  function removeQuestion(variantIndex, questionIndex) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions = newVariants[
      variantIndex
    ].questions.filter((_, i) => i !== questionIndex);
    setTestData({ ...testData, variants: newVariants });
  }

  function updateQuestion(variantIndex, questionIndex, field, value) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex][field] = value;

    if (field === "type") {
      if (value === "MULTIPLE_CHOICE") {
        newVariants[variantIndex].questions[questionIndex].options = [
          { text: "", isCorrect: false },
        ];
        newVariants[variantIndex].questions[questionIndex].pairs = [];
      } else if (value === "MATCHING") {
        newVariants[variantIndex].questions[questionIndex].pairs = [
          { left: "", right: "" },
        ];
        newVariants[variantIndex].questions[questionIndex].options = [];
      } else {
        newVariants[variantIndex].questions[questionIndex].options = [];
        newVariants[variantIndex].questions[questionIndex].pairs = [];
      }
    }

    setTestData({ ...testData, variants: newVariants });
  }

  function addOption(variantIndex, questionIndex) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex].options.push({
      text: "",
      isCorrect: false,
    });
    setTestData({ ...testData, variants: newVariants });
  }

  function updateOption(
    variantIndex,
    questionIndex,
    optionIndex,
    field,
    value,
  ) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex].options[optionIndex][
      field
    ] = value;
    setTestData({ ...testData, variants: newVariants });
  }

  function removeOption(variantIndex, questionIndex, optionIndex) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex].options = newVariants[
      variantIndex
    ].questions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setTestData({ ...testData, variants: newVariants });
  }

  function addPair(variantIndex, questionIndex) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex].pairs.push({
      left: "",
      right: "",
    });
    setTestData({ ...testData, variants: newVariants });
  }

  function updatePair(variantIndex, questionIndex, pairIndex, field, value) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex].pairs[pairIndex][field] =
      value;
    setTestData({ ...testData, variants: newVariants });
  }

  function removePair(variantIndex, questionIndex, pairIndex) {
    const newVariants = [...testData.variants];
    newVariants[variantIndex].questions[questionIndex].pairs = newVariants[
      variantIndex
    ].questions[questionIndex].pairs.filter((_, i) => i !== pairIndex);
    setTestData({ ...testData, variants: newVariants });
  }

  function questionAnswerLines(question) {
    if (question.type === "MULTIPLE_CHOICE") {
      return question.options.map(
        (o, i) =>
          `${String.fromCharCode(97 + i)}) ${o.text}${o.isCorrect ? " ✓" : ""}`,
      );
    }
    if (question.type === "MATCHING") {
      return question.pairs.map((p) => `${p.left} ↔ ${p.right}`);
    }
    return [];
  }

  async function downloadAsWord() {
    const children = [
      new Paragraph({
        text: testData.title || "Тест",
        heading: HeadingLevel.TITLE,
      }),
    ];
    if (testData.description) {
      children.push(new Paragraph({ text: testData.description }));
    }

    testData.variants.forEach((variant) => {
      children.push(
        new Paragraph({ text: variant.name, heading: HeadingLevel.HEADING_1 }),
      );
      variant.questions.forEach((question, qi) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${qi + 1}. ${stripHtml(question.text)} (${question.points} балл)`,
                bold: true,
              }),
            ],
          }),
        );
        questionAnswerLines(question).forEach((line) => {
          children.push(new Paragraph({ text: line, indent: { left: 360 } }));
        });
      });
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${testData.title || "test"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAsPdf() {
    // jsPDF-и стандартӣ ҳарфҳои кириллиро дастгирӣ намекунад, бинобар ин
    // ҳуруфи Noto Sans (дастгирикунандаи кириллӣ)-ро дар вақти иҷро бор мекунем.
    const fontBase64 = await getCyrillicFontBase64();

    const doc = new jsPDF();
    doc.addFileToVFS("NotoSans-Regular.ttf", fontBase64);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.setFont("NotoSans", "normal");

    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    const maxWidth = 180;
    let y = 20;

    const addLines = (text, options = {}) => {
      const { fontSize = 11, indent = 0 } = options;
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      lines.forEach((line) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginX + indent, y);
        y += fontSize / 2;
      });
      y += 2;
    };

    addLines(testData.title || "Тест", { fontSize: 16 });
    if (testData.description) {
      addLines(testData.description, { fontSize: 10 });
    }

    testData.variants.forEach((variant) => {
      y += 4;
      addLines(variant.name, { fontSize: 13 });
      variant.questions.forEach((question, qi) => {
        addLines(`${qi + 1}. ${stripHtml(question.text)} (${question.points} балл)`, {
          fontSize: 11,
        });
        questionAnswerLines(question).forEach((line) => {
          addLines(line, { fontSize: 10, indent: 5 });
        });
      });
    });

    doc.save(`${testData.title || "test"}.pdf`);
  }

  async function handleDownload(format) {
    setDownloadingFormat(format);
    try {
      if (format === "pdf") {
        await downloadAsPdf();
      } else {
        await downloadAsWord();
      }
    } catch (error) {
      toast.error("Хатогӣ ҳангоми боргирӣ: " + error.message);
    } finally {
      setDownloadingFormat(null);
    }
  }

  const hasGeneratedQuestions = testData.variants.some(
    (v) => v.questions.length > 0,
  );

  async function handleSubmit(e) {
    e.preventDefault();

    if (!testData.title || testData.variants.length === 0) {
      toast.error("Лутфан номи тест ва ақаллан як вариантро илова кунед");
      return;
    }

    for (const variant of testData.variants) {
      if (variant.questions.length === 0) {
        toast.error("Ҳар як вариант бояд ақаллан як савол дошта бошад");
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(testData);
    } catch (error) {
      toast.error(error?.message || "Хатогӣ рӯй дод");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <Dialog open={!!diagnostics} onOpenChange={() => setDiagnostics(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Диагностикаи пайваст
            </DialogTitle>
            <DialogDescription>
              Вақти интизорӣ ба охир расид. Инҳо маълумот дар бораи пайвасти
              шумо:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {diagnostics?.online ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <span>Интернет: {diagnostics?.online ? "Ҳаст" : "Нест"}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Signal className="h-4 w-4 text-blue-600" />
                <span>
                  Сервер:{" "}
                  {diagnostics?.serverReachability ? "Дастрас" : "Ғайридастрас"}
                </span>
              </div>
            </div>
            {diagnostics?.latency && (
              <div className="text-xs text-muted-foreground p-2 border rounded">
                Таъхири сервер (Latency): {diagnostics.latency}ms
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Эзоҳ: Моделҳои калони забонӣ баъзан метавонанд зиёда аз 10 дақиқа
              вақт гиранд ё пайвастро қатъ кунанд. Лутфан дубора кӯшиш кунед ё
              миқдори саволҳоро кам кунед.
            </p>
          </div>
          <Button onClick={() => setDiagnostics(null)} className="w-full">
            Пӯшидан
          </Button>
        </DialogContent>
      </Dialog>

      <AppHeader title={pageTitle} backHref="/teacher" />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>{pageTitle}</CardTitle>
            <CardDescription>{pageDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* AI Configuration */}
              <div className="p-5 bg-accent/30 border border-primary/25 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="text-primary h-5 w-5" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Генератсияи савол бо KIMI AI
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ai-count">Миқдори саволҳо</Label>
                    <Input
                      id="ai-count"
                      type="number"
                      min="1"
                      max="10"
                      value={aiConfig.count}
                      onChange={(e) =>
                        setAiConfig({ ...aiConfig, count: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ai-subject">Мавзӯъ</Label>
                    <Input
                      id="ai-subject"
                      value={aiConfig.subject}
                      onChange={(e) =>
                        setAiConfig({ ...aiConfig, subject: e.target.value })
                      }
                      placeholder="Масалан: Риёзиёт, Физика, Тарих"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ai-difficulty">Душворӣ</Label>
                  <Input
                    id="ai-difficulty"
                    value={aiConfig.difficulty}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, difficulty: e.target.value })
                    }
                    placeholder="Масалан: Осон, Миёна, Душвор"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ai-language">Забони саволҳо</Label>
                    <Select
                      value={aiConfig.language}
                      onValueChange={(value) =>
                        setAiConfig({ ...aiConfig, language: value })
                      }
                    >
                      <SelectTrigger id="ai-language" className="mt-1">
                        <SelectValue placeholder="Забонро интихоб кунед" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="тоҷикӣ">Тоҷикӣ</SelectItem>
                        <SelectItem value="русский">Русский</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ai-variant-count">Миқдори вариантҳо</Label>
                    <Input
                      id="ai-variant-count"
                      type="number"
                      min="1"
                      max="10"
                      value={aiConfig.variantCount}
                      onChange={(e) =>
                        setAiConfig({
                          ...aiConfig,
                          variantCount: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ai-description">Тавсифи иловагӣ</Label>
                  <Textarea
                    id="ai-description"
                    value={aiConfig.description}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, description: e.target.value })
                    }
                    placeholder="Масалан: Саволҳо бояд дар бораи қонунҳои Нютон бошанд ва бо мисолҳо..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Button
                  type="button"
                  onClick={generateTest}
                  disabled={aiLoading}
                  className="w-full"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Дар ҳоли генератсия...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Генератсияи савол бо KIMI AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Саволҳои сохташуда ба вариантҳои мавҷуда илова карда мешаванд
                </p>

                {/* Ҳуҷҷат боркунӣ */}
                <div className="border-t border-primary/25 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="text-primary h-4 w-4" />
                    <h4 className="font-semibold text-foreground">
                      Ё аз ҳуҷҷат (PDF ё Word)
                    </h4>
                  </div>
                  <div>
                    <Label htmlFor="ai-file">Файл</Label>
                    <Input
                      id="ai-file"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setAiFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ai-file-desc">
                      Дастурҳо барои AI (ихтиёрӣ)
                    </Label>
                    <Textarea
                      id="ai-file-desc"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Масалан: аз саҳифаи 5 то 10 савол тавлид кун"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={generateTestFromFile}
                    disabled={aiLoading || !aiFile}
                    className="w-full"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Дар ҳоли генератсия...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Аз ҳуҷҷат тавлид кун
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Test Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Номи тест *</Label>
                  <Input
                    id="title"
                    value={testData.title}
                    onChange={(e) =>
                      setTestData({ ...testData, title: e.target.value })
                    }
                    placeholder="Масалан: Санҷиши риёзӣ, боби 1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Тавсиф</Label>
                  <Textarea
                    id="description"
                    value={testData.description}
                    onChange={(e) =>
                      setTestData({ ...testData, description: e.target.value })
                    }
                    placeholder="Тавсифи кӯтоҳи тест"
                    rows={3}
                  />
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <h3 className="text-lg font-semibold">Вариантҳо</h3>
                  <div className="flex flex-wrap gap-2">
                    {hasGeneratedQuestions && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload("pdf")}
                          disabled={downloadingFormat !== null}
                        >
                          {downloadingFormat === "pdf" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="mr-2 h-4 w-4" />
                          )}
                          PDF
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload("word")}
                          disabled={downloadingFormat !== null}
                        >
                          {downloadingFormat === "word" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="mr-2 h-4 w-4" />
                          )}
                          Word
                        </Button>
                      </>
                    )}
                    <Button type="button" onClick={addVariant} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Иловаи вариант
                    </Button>
                  </div>
                </div>

                {testData.variants.map((variant, variantIndex) => (
                  <Card key={variantIndex} className="border-zinc-200/80">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <Input
                          value={variant.name}
                          onChange={(e) => {
                            const newVariants = [...testData.variants];
                            newVariants[variantIndex].name = e.target.value;
                            setTestData({ ...testData, variants: newVariants });
                          }}
                          className="font-semibold max-w-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addQuestion(variantIndex)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Иловаи sавол
                          </Button>
                          {testData.variants.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeVariant(variantIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {variant.questions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Ҳанӯз саволе илова нашудааст
                        </p>
                      ) : (
                        variant.questions.map((question, questionIndex) => (
                          <Card
                            key={questionIndex}
                            className="border-zinc-200/80 bg-zinc-50/60"
                          >
                            <CardContent className="pt-4 space-y-3">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <Label>Савол {questionIndex + 1}</Label>
                                    <RichTextEditor
                                      value={question.text}
                                      onChange={(html) =>
                                        updateQuestion(
                                          variantIndex,
                                          questionIndex,
                                          "text",
                                          html,
                                        )
                                      }
                                      placeholder="Матни саволро ворид кунед"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Навъ</Label>
                                      <select
                                        className="flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-[0_1px_2px_rgba(9,9,11,0.03)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-ring"
                                        value={question.type}
                                        onChange={(e) =>
                                          updateQuestion(
                                            variantIndex,
                                            questionIndex,
                                            "type",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <option value="MULTIPLE_CHOICE">
                                          Интихоби сершумор
                                        </option>
                                        <option value="MATCHING">
                                          Мутобиқсозӣ
                                        </option>
                                        <option value="OPEN">Кушод</option>
                                      </select>
                                    </div>
                                    <div>
                                      <Label>Холҳо</Label>
                                      <Input
                                        type="number"
                                        value={question.points}
                                        onChange={(e) =>
                                          updateQuestion(
                                            variantIndex,
                                            questionIndex,
                                            "points",
                                            parseInt(e.target.value) || 1,
                                          )
                                        }
                                        min="1"
                                      />
                                    </div>
                                  </div>

                                  {/* Multiple Choice Options */}
                                  {question.type === "MULTIPLE_CHOICE" && (
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <Label>Интихобҳо</Label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            addOption(
                                              variantIndex,
                                              questionIndex,
                                            )
                                          }
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      {question.options.map(
                                        (option, optionIndex) => (
                                          <div
                                            key={optionIndex}
                                            className="flex gap-2 items-center"
                                          >
                                            <Input
                                              value={option.text}
                                              onChange={(e) =>
                                                updateOption(
                                                  variantIndex,
                                                  questionIndex,
                                                  optionIndex,
                                                  "text",
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={`Интихоби ${optionIndex + 1}`}
                                            />
                                            <label className="flex items-center gap-2 whitespace-nowrap">
                                              <input
                                                type="checkbox"
                                                checked={option.isCorrect}
                                                onChange={(e) =>
                                                  updateOption(
                                                    variantIndex,
                                                    questionIndex,
                                                    optionIndex,
                                                    "isCorrect",
                                                    e.target.checked,
                                                  )
                                                }
                                              />
                                              <span className="text-sm">
                                                Дуруст
                                              </span>
                                            </label>
                                            {question.options.length > 1 && (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  removeOption(
                                                    variantIndex,
                                                    questionIndex,
                                                    optionIndex,
                                                  )
                                                }
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                  {/* Matching Pairs */}
                                  {question.type === "MATCHING" && (
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <Label>Ҷуфтҳо</Label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            addPair(variantIndex, questionIndex)
                                          }
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      {question.pairs.map((pair, pairIndex) => (
                                        <div
                                          key={pairIndex}
                                          className="flex gap-2 items-center"
                                        >
                                          <Input
                                            value={pair.left}
                                            onChange={(e) =>
                                              updatePair(
                                                variantIndex,
                                                questionIndex,
                                                pairIndex,
                                                "left",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="Тарафи чап"
                                          />
                                          <span>↔</span>
                                          <Input
                                            value={pair.right}
                                            onChange={(e) =>
                                              updatePair(
                                                variantIndex,
                                                questionIndex,
                                                pairIndex,
                                                "right",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="Тарафи рост"
                                          />
                                          {question.pairs.length > 1 && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                removePair(
                                                  variantIndex,
                                                  questionIndex,
                                                  pairIndex,
                                                )
                                              }
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {question.type === "OPEN" && (
                                    <p className="text-sm text-muted-foreground italic">
                                      Савол бо ҷавоби кушод (матни)
                                    </p>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    removeQuestion(variantIndex, questionIndex)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div ref={variantsEndRef} />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? submittingLabel : submitLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/teacher")}
                >
                  Бекор кардан
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
