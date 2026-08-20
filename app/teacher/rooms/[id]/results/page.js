'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { LoadingScreen } from '@/components/loading-screen';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomResults() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id;

  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId) {
      checkAuth();
      loadData();
    }
  }, [roomId]);

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

  async function loadData() {
    try {
      const res = await fetch(`/api/rooms/${roomId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setRoom(data.room);
      } else {
        toast.error('Боркунии натиҷаҳо муяссар нашуд');
      }
    } catch (error) {
      console.error('Load results error:', error);
      toast.error('Хатогӣ ҳангоми боркунии маълумот');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!room) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <AppHeader title="Натиҷаҳо" backHref="/teacher" showLogout={false} />
        <EmptyState icon={ClipboardList} title="Ҳуҷра ёфт нашуд" />
      </div>
    );
  }

  const averageScore = results.length > 0
    ? (results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length).toFixed(1)
    : 0;

  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;

  const passCount = results.filter(r => r.percentage >= 60).length;
  const passRate = results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : 0;

  const stats = [
    { label: 'Иштирокчиён', value: results.length, suffix: '' },
    { label: 'Миёнаи холҳо', value: averageScore, suffix: '%' },
    { label: 'Баландтарин', value: highestScore, suffix: '%' },
    { label: 'Гузаштанд', value: passRate, suffix: '%' },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={room.name}
        subtitle={room.test?.title}
        backHref={`/teacher/rooms/${roomId}`}
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        {/* Нишондиҳандаҳо */}
        <div
          className="animate-enter mb-10 grid grid-cols-2 gap-6 border-b border-zinc-200/80 pb-8 md:grid-cols-4"
          style={{ '--index': 0 }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-3xl font-semibold tracking-tight">
                {stat.value}
                <span className="text-lg text-muted-foreground">{stat.suffix}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Ҷадвал */}
        <section className="animate-enter" style={{ '--index': 1 }}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Рӯйхати натиҷаҳо
          </h2>

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60">
              <EmptyState
                icon={ClipboardList}
                title="Натиҷаҳо ҳанӯз вуҷуд надоранд"
                description="Натиҷаҳо пас аз ирсоли ҷавобҳои донишҷӯён инҷо намоён мешаванд"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Донишҷӯ</th>
                      <th className="px-5 py-3 text-center font-semibold">Холҳо</th>
                      <th className="px-5 py-3 text-center font-semibold">Фоиз</th>
                      <th className="px-5 py-3 text-center font-semibold">Статус</th>
                      <th className="px-5 py-3 text-right font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {results.map((result, i) => (
                      <tr
                        key={result._id}
                        className="animate-enter cursor-pointer transition-colors hover:bg-zinc-50"
                        style={{ '--index': 2 + i }}
                        onClick={() => router.push(`/teacher/rooms/${roomId}/results/${result.studentId}`)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold uppercase text-zinc-700">
                              {result.student?.name?.charAt(0) || '?'}
                            </span>
                            <span className="font-medium">{result.student?.name || 'Номаълум'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono">
                          {result.score}
                          <span className="text-muted-foreground">/{result.totalPoints}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-2.5">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className={`h-full rounded-full ${result.percentage >= 60 ? 'bg-primary' : 'bg-destructive'}`}
                                style={{ width: `${result.percentage}%` }}
                              />
                            </div>
                            <span className="w-12 font-mono font-medium">{result.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {result.hasPendingOpen ? (
                            <Badge variant="secondary" className="text-amber-700 bg-amber-50">
                              Тафтиш нашудааст
                            </Badge>
                          ) : (
                            <Badge variant={result.percentage >= 60 ? 'default' : 'destructive'}>
                              {result.percentage >= 60 ? 'Гузашт' : 'Нагузашт'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                            Тафсилот
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
