"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { TestForm } from "@/components/test-form";
import { LoadingScreen } from "@/components/loading-screen";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";

export default function EditTest() {
  const router = useRouter();
  const params = useParams();
  const testId = params?.id;

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId) {
      checkAuth();
      loadTest();
    }
  }, [testId]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok || !(await res.json()).user) {
        router.push("/");
      }
    } catch (error) {
      router.push("/");
    }
  }

  async function loadTest() {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      if (res.ok) {
        const data = await res.json();
        setTest(data.test);
      }
    } catch (error) {
      console.error("Load test error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(testData) {
    const res = await fetch(`/api/tests/${testId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    if (res.ok) {
      toast.success("Тест бомуваффақият навсозӣ шуд!");
      router.push("/teacher");
    } else {
      const data = await res.json();
      throw new Error(data.error || "Хатогӣ ҳангоми навсозии тест");
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!test) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <AppHeader title="Тест" backHref="/teacher" showLogout={false} />
        <EmptyState icon={FileText} title="Тест ёфт нашуд" />
      </div>
    );
  }

  return (
    <TestForm
      initialTest={test}
      pageTitle="Таҳрири тест"
      pageDescription="Тести худро таҳрир кунед"
      submitLabel="Захира кардани тағйирот"
      submittingLabel="Захира шуда истодааст..."
      onSubmit={handleUpdate}
    />
  );
}
