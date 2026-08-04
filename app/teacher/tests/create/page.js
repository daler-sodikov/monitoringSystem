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
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function CreateTest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Stream holati: qabul qilingan matn va yakuniy natija
  const [streamedText, setStreamedText] = useState("");
  const [streamDone, setStreamDone] = useState(false);
  const previewRef = useRef(null);

  // Ҳуҷҷат боркунӣ: файл ва дастури иловагии корбар
  const [aiFile, setAiFile] = useState(null);
  const [fileDescription, setFileDescription] = useState("");

  const [diagnostics, setDiagnostics] = useState(null);
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    variants: [
      {
        name: "Варианти 1",
        questions: [],
      },
    ],
  });
  const [aiConfig, setAiConfig] = useState({
    count: 1,
    subject: "",
    level: "",
    difficulty: "",
    description: "",
    language: "тоҷикӣ",
    variantCount: 1,
  });

  // Progress stream asosida: qabul qilingan belgilar soni taxminiy hajmga nisbatan
  const estimatedChars =
    Math.max(
      1,
      (parseInt(aiConfig.count) || 1) * (parseInt(aiConfig.variantCount) || 1),
    ) * 450;
  const progressValue = streamDone
    ? 100
    : Math.min(95, Math.round((streamedText.length / estimatedChars) * 100));

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

  // Yangi qism kelganda preview pastga sirpanadi
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamedText]);

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
    setStreamedText("");
    setStreamDone(false);

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

      const { doneData, streamError } = await readGenerationStream(
        res,
        (delta) => setStreamedText((prev) => prev + delta),
      );

      if (streamError) {
        toast.error(streamError);
        return;
      }

      if (doneData?.variants) {
        // Stream tugadi -> progress 100% ga yetadi va dialog yopiladi
        setStreamDone(true);
        await new Promise((resolve) => setTimeout(resolve, 600));

        setTestData({
          ...testData,
          title: testData.title || aiConfig.subject,
          variants: doneData.variants,
        });
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
    setStreamedText("");
    setStreamDone(false);

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

      const { doneData, streamError } = await readGenerationStream(
        res,
        (delta) => setStreamedText((prev) => prev + delta),
      );

      if (streamError) {
        toast.error(streamError);
        return;
      }

      if (doneData?.variants) {
        setStreamDone(true);
        await new Promise((resolve) => setTimeout(resolve, 600));

        setTestData({
          ...testData,
          title: testData.title || aiFile.name.replace(/\.[^.]+$/, ""),
          variants: doneData.variants,
        });
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
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      });

      if (res.ok) {
        toast.success("Тест бомуваффақият сохта шуд!");
        router.push("/teacher");
      } else {
        const data = await res.json();
        toast.error(data.error || "Хатогӣ ҳангоми сохтани тест");
      }
    } catch (error) {
      toast.error("Хатогӣ рӯй дод");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <Dialog open={aiLoading}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Генератсияи саволҳо бо AI
            </DialogTitle>
            <DialogDescription>
              Лутфан саҳифаро нав накунед. AI дар ҳоли сохтани тест аст.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative">
              {/* Stream ochilganda spinner tezlashadi */}
              <Loader2
                className="h-16 w-16 text-primary"
                style={{
                  animation: "spin linear infinite",
                  animationDuration: streamedText ? "0.75s" : "2.5s",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-primary">
                    {progressValue}%
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2 w-full">
              <p className="font-medium text-lg text-foreground h-7">
                {streamDone
                  ? "Маълумот қабул шуд! Омодасозии ниҳоӣ..."
                  : streamedText
                    ? `Қабул шуда истодааст: ${streamedText.length} аломат`
                    : "Пайвастшавӣ ба AI..."}
              </p>
              <Progress
                value={progressValue}
                className="h-2 transition-all duration-300 ease-out"
              />
              <p className="text-xs text-muted-foreground italic">
                {streamDone
                  ? "Камтар аз як сония монд..."
                  : "Ҷавоби AI дар вақти воқеӣ намоиш дода мешавад"}
              </p>
            </div>
            {/* Streamdan kelayotgan matnning jonli namoyishi */}
            {streamedText && (
              <div
                ref={previewRef}
                className="w-full max-h-36 overflow-y-auto rounded-md border bg-muted/50 p-2"
              >
                <pre className="text-[10px] leading-4 font-mono whitespace-pre-wrap break-all text-muted-foreground">
                  {streamedText}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      <AppHeader title="Сохтани тести нав" backHref="/teacher" />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Сохтани тести нав</CardTitle>
            <CardDescription>
              Тести худро бо якчанд вариант ва саволҳо созед
            </CardDescription>
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
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Вариантҳо</h3>
                  <Button type="button" onClick={addVariant} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Иловаи вариант
                  </Button>
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
                                    <Textarea
                                      value={question.text}
                                      onChange={(e) =>
                                        updateQuestion(
                                          variantIndex,
                                          questionIndex,
                                          "text",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Матни саволро ворид кунед"
                                      rows={2}
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
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Сохта истодааст..." : "Сохтани тест"}
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
