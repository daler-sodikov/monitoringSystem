"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, Trash2, Loader2 } from "lucide-react";
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Дар ҳоли боргузорӣ...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Панели омӯзгор</h1>
            <p className="text-muted-foreground">Хуш омадед, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Баромад
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tests Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Тестҳои ман</CardTitle>
                  <CardDescription>
                    Идоракунии китобхонаи тестҳо
                  </CardDescription>
                </div>
                <Button onClick={() => router.push("/teacher/tests/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Сохтани тест
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Тестҳо ҳанӯз нестанд. Аввалин тести худро созед!
                  </p>
                ) : (
                  tests.map((test) => (
                    <div
                      key={test._id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{test.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {test.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/teacher/tests/${test._id}`)
                            }
                          >
                            Дидан
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTest(test._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rooms Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Синфхонаҳои ман</CardTitle>
                  <CardDescription>
                    Синфхонаҳои тестии фаъол ва гузашта
                  </CardDescription>
                </div>
                <Button onClick={() => router.push("/teacher/rooms/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Сохтани синфхона
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rooms.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Синфхонаҳо ҳанӯз нестанд. Аз рӯи тест синфхона созед!
                  </p>
                ) : (
                  rooms.map((room) => (
                    <div
                      key={room._id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold">{room.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {room.test?.title}
                          </p>
                        </div>
                        <Badge
                          variant={
                            room.status === "OPEN" ? "default" : "secondary"
                          }
                        >
                          {room.status === "OPEN" ? "КУШОДА" : "ПУШИДА"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">

                          <span className="text-sm font-bold tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {room.code}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/teacher/rooms/${room.code}`)
                            }
                          >
                            Дидан
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
