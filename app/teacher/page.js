"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingScreen } from "@/components/loading-screen";
import {
  Plus,
  Trash2,
  FileText,
  DoorOpen,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.user.role === "TEACHER") {
          setUser(data.user);
          loadTests();
          loadRooms();
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function loadTests() {
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error("Load tests error:", error);
    }
  }

  async function loadRooms() {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error("Load rooms error:", error);
    }
  }

  async function deleteTest(testId) {
    if (!confirm("Шумо мутмаин ҳастед, ки ин тестро нест кардан мехоҳед?"))
      return;

    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Тест нест карда шуд");
        loadTests();
      } else {
        toast.error("Хатогӣ ҳангоми нест кардани тест");
      }
    } catch (error) {
      toast.error("Хатогӣ рӯй дод");
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  const openRooms = rooms.filter((room) => room.status === "OPEN").length;

  const stats = [
    { label: "Тестҳо", value: tests.length },
    { label: "Синфхонаҳо", value: rooms.length },
    { label: "Кушода", value: openRooms },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title="Панели омӯзгор"
        subtitle={`Хуш омадед, ${user?.name}`}
        userName={user?.name}
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        {/* Нишондиҳандаҳо */}
        <div
          className="animate-enter mb-10 flex flex-col gap-4 border-b border-zinc-200/80 pb-8 sm:flex-row sm:items-end sm:gap-10"
          style={{ "--index": 0 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-semibold tracking-tight">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => router.push("/teacher/tests/create")}
            >
              <Plus className="h-4 w-4" />
              Тест
            </Button>
            <Button onClick={() => router.push("/teacher/rooms/create")}>
              <Plus className="h-4 w-4" />
              Синфхона
            </Button>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-5">
          {/* Тестҳо */}
          <section
            className="animate-enter lg:col-span-2"
            style={{ "--index": 1 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Тестҳои ман
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/teacher/tests/create")}
              >
                <Plus className="h-3.5 w-3.5" />
                Нав
              </Button>
            </div>

            {tests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60">
                <EmptyState
                  icon={FileText}
                  title="Тестҳо ҳанӯз нестанд"
                  description="Аввалин тести худро бо даст ё бо ёрии AI созед"
                  action={
                    <Button
                      size="sm"
                      onClick={() => router.push("/teacher/tests/create")}
                    >
                      <Plus className="h-4 w-4" />
                      Сохтани тест
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70 rounded-xl border border-zinc-200/80 bg-white">
                {tests.map((test, i) => (
                  <div
                    key={test._id}
                    className="animate-enter group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50"
                    style={{ "--index": 2 + i }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{test.title}</p>
                      {test.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {test.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/teacher/tests/${test._id}`)}
                      className="shrink-0"
                    >
                      Дидан
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => router.push(`/teacher/tests/${test._id}/edit`)}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Таҳрир кардан"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTest(test._id)}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Нест кардан"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Синфхонаҳо */}
          <section
            className="animate-enter lg:col-span-3"
            style={{ "--index": 2 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Синфхонаҳои ман
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/teacher/rooms/create")}
              >
                <Plus className="h-3.5 w-3.5" />
                Нав
              </Button>
            </div>

            {rooms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60">
                <EmptyState
                  icon={DoorOpen}
                  title="Синфхонаҳо ҳанӯз нестанд"
                  description="Аз рӯи тест синфхона созед ва кодро бо донишҷӯён мубодила кунед"
                  action={
                    <Button
                      size="sm"
                      onClick={() => router.push("/teacher/rooms/create")}
                    >
                      <Plus className="h-4 w-4" />
                      Сохтани синфхона
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70 rounded-xl border border-zinc-200/80 bg-white">
                {rooms.map((room, i) => (
                  <div
                    key={room._id}
                    className="animate-enter group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-zinc-50"
                    style={{ "--index": 3 + i }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {room.status === "OPEN" ? (
                        <span className="breathing-dot h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-300" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{room.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {room.test?.title}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold tracking-[0.2em] text-zinc-700">
                      {room.code}
                    </span>
                    <Badge
                      variant={
                        room.status === "OPEN" ? "default" : "secondary"
                      }
                    >
                      {room.status === "OPEN" ? "КУШОДА" : "ПҮШИДА"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() =>
                        router.push(`/teacher/rooms/${room.code}`)
                      }
                    >
                      Дидан
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
