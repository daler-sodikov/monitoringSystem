"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TestForm } from "@/components/test-form";

export default function CreateTest() {
  const router = useRouter();

  async function handleCreate(testData) {
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
      throw new Error(data.error || "Хатогӣ ҳангоми сохтани тест");
    }
  }

  return (
    <TestForm
      pageTitle="Сохтани тести нав"
      pageDescription="Тести худро бо якчанд вариант ва саволҳо созед"
      submitLabel="Сохтани тест"
      submittingLabel="Сохта истодааст..."
      onSubmit={handleCreate}
    />
  );
}
