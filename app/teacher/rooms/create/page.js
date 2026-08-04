'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList, FileText, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const howItWorks = [
  {
    icon: FileText,
    title: 'Тестро интихоб кунед',
    text: 'Ҳуҷра ба як тести мавҷуда пайваст мешавад',
  },
  {
    icon: ClipboardList,
    title: 'Ном гузоред',
    text: 'Масалан, баста ё гурӯҳи донишҷӯёнро нишон диҳед',
  },
  {
    icon: Share2,
    title: 'Кодро мубодила кунед',
    text: 'Донишҷӯён бо код ё истинод ворид мешаванд',
  },
];

export default function CreateRoom() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomData, setRoomData] = useState({
    testId: '',
    name: ''
  });

  useEffect(() => {
    checkAuth();
    loadTests();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok || !(await res.json()).user) {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    }
  }

  async function loadTests() {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Load tests error:', error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!roomData.testId || !roomData.name) {
      toast.error('Лутфан тест ва номи ҳуҷраро интихоб кунед');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Ҳуҷра бомуваффақият сохта шуд!');
        router.push(`/teacher/rooms/${data.roomId}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Сохтани ҳуҷра муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Сохтани ҳуҷраи нав" backHref="/teacher" />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Тарзи кор */}
          <div className="animate-enter lg:col-span-2" style={{ '--index': 0 }}>
            <h2 className="text-2xl font-semibold tracking-tighter">
              Ҳуҷра чӣ тавр кор мекунад
            </h2>
            <div className="mt-8 space-y-0 border-l-2 border-zinc-200/80">
              {howItWorks.map((step, i) => (
                <div
                  key={step.title}
                  className="animate-enter relative pb-8 pl-8 last:pb-0"
                  style={{ '--index': 1 + i }}
                >
                  <span className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <step.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <h3 className="font-semibold tracking-tight">{step.title}</h3>
                  </div>
                  <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Форма */}
          <div className="animate-enter lg:col-span-3" style={{ '--index': 2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="tracking-tight">Ҳуҷраи нав</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="test">Интихоби тест *</Label>
                    <select
                      id="test"
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3.5 text-sm shadow-[0_1px_2px_rgba(9,9,11,0.03)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-ring"
                      value={roomData.testId}
                      onChange={(e) => setRoomData({ ...roomData, testId: e.target.value })}
                      required
                    >
                      <option value="">Тестро интихоб кунед</option>
                      {tests.map((test) => (
                        <option key={test._id} value={test._id}>
                          {test.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Саволҳои ҳуҷра аз ин тест гирифта мешаванд
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Номи ҳуҷра *</Label>
                    <Input
                      id="name"
                      value={roomData.name}
                      onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                      placeholder="Масалан: Санҷиши риёзӣ, Қисми А"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={loading} className="flex-1" size="lg">
                      {loading ? 'Сохта истодааст...' : 'Сохтани ҳуҷра'}
                    </Button>
                    <Button type="button" variant="outline" size="lg" onClick={() => router.push('/teacher')}>
                      Бекор кардан
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
