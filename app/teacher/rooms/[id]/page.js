'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { LoadingScreen } from '@/components/loading-screen';
import { Badge } from '@/components/ui/badge';
import { Copy, X, BarChart3, ChevronRight, Users, Link2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomView() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id;

  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId) {
      checkAuth();
      loadRoom();
      loadResults();
    }
  }, [roomId]);

  // Модоме ки ҳуҷра кушода аст, рӯйхати супоридашударо давра ба давра нав мекунем
  useEffect(() => {
    if (!roomId || room?.status !== 'OPEN') return;
    const interval = setInterval(loadResults, 5000);
    return () => clearInterval(interval);
  }, [roomId, room?.status]);

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

  async function loadRoom() {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
      }
    } catch (error) {
      console.error('Load room error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResults() {
    try {
      const res = await fetch(`/api/rooms/${roomId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Load results error:', error);
    }
  }

  async function handleCloseRoom() {
    if (!confirm('Шумо мутмаин ҳастед, ки ин ҳуҷраро пӯшед? Ҳамаи ҷавобҳо автоматикӣ санҷида мешаванд.')) return;

    try {
      const res = await fetch(`/api/rooms/${roomId}/close`, { method: 'POST' });
      if (res.ok) {
        toast.success('Ҳуҷра пӯшида шуд ва ҷавобҳо санҷида шуданд!');
        loadRoom();
        loadResults();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Пӯшидани ҳуҷра муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    }
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomId);
    toast.success('Коди ҳӯҷра нусхабардорӣ шуд!');
  }

  function copyRoomLink() {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Истиноди ҳӯҷра нусхабардорӣ шуд!');
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!room) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <AppHeader title="Ҳуҷра" backHref="/teacher" showLogout={false} />
        <EmptyState
          icon={Users}
          title="Ҳуҷра ёфт нашуд"
          description="Ҳуҷрае, ки ҷустуҷӯ мекунед, вуҷуд надорад"
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={room.name}
        subtitle={room.test?.title}
        backHref="/teacher"
        actions={
          room.status === 'OPEN' ? (
            <Button variant="destructive" size="sm" onClick={handleCloseRoom}>
              <X className="h-4 w-4" />
              Пӯшидани ҳуҷра
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => router.push(`/teacher/rooms/${roomId}/results`)}
            >
              <BarChart3 className="h-4 w-4" />
              Натиҷаҳо
            </Button>
          )
        }
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        {/* Коди ҳуҷра */}
        <div
          className="animate-enter flex flex-col gap-6 border-b border-zinc-200/80 pb-10 md:flex-row md:items-center"
          style={{ '--index': 0 }}
        >
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Коди ҳӯҷра
              </span>
              <Badge variant={room.status === 'OPEN' ? 'default' : 'secondary'}>
                {room.status === 'OPEN' ? 'КУШОДА' : 'ПҮШИДА'}
              </Badge>
            </div>
            <p className="font-mono text-5xl font-bold tracking-[0.3em] text-zinc-900">
              {roomId}
            </p>
          </div>
          <div className="max-w-sm text-sm leading-relaxed text-muted-foreground md:ml-auto">
            Ин кодро бо донишҷӯён мубодила кунед, то онҳо ба сайт ворид шаванд
            ва кодро ворид кунанд.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyRoomCode}>
              <Copy className="h-4 w-4" />
              Код
            </Button>
            <Button variant="outline" onClick={copyRoomLink}>
              <Link2 className="h-4 w-4" />
              Истинод
            </Button>
          </div>
        </div>

        {room.status !== 'OPEN' && (
          <p className="animate-enter mt-4 text-sm text-muted-foreground" style={{ '--index': 1 }}>
            Ин ҳӯҷра пӯшида шудааст. Донишҷӯён дигар наметавонанд ҷавобҳои худро
            ирсол кунанд.
          </p>
        )}

        {/* Натиҷаҳо ё донишҷӯёни супоридашуда */}
        <section className="animate-enter mt-10" style={{ '--index': 2 }}>
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {room.status === 'OPEN' ? 'Супоридаанд' : 'Натиҷаҳо'}
            </h2>
            {room.status === 'OPEN'
              ? submissions.length > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {submissions.length} донишҷӯ
                  </span>
                )
              : results.length > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {results.length} донишҷӯ
                  </span>
                )}
          </div>

          {room.status === 'OPEN' ? (
            submissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60">
                <EmptyState
                  icon={Users}
                  title="Интизори донишҷӯён"
                  description="Кодро мубодила кунед ва интизори ҳамроҳшавии донишҷӯён бошед"
                />
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/70 rounded-xl border border-zinc-200/80 bg-white">
                {submissions.map((submission, i) => (
                  <button
                    key={submission._id}
                    onClick={() =>
                      router.push(`/teacher/rooms/${roomId}/results/${submission.studentId}`)
                    }
                    className="animate-enter flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50"
                    style={{ '--index': 3 + i }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold uppercase text-zinc-700">
                      {submission.student?.name?.charAt(0) || '?'}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {submission.student?.name || 'Номаълум'}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(submission.submittedAt).toLocaleTimeString('tg-TJ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Супорид
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60">
              <EmptyState
                icon={Users}
                title="Натиҷа нест"
                description="Ҳеҷ донишҷӯе ин тестро супорида нашудааст"
              />
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/70 rounded-xl border border-zinc-200/80 bg-white">
              {results.map((result, i) => (
                <button
                  key={result._id}
                  onClick={() =>
                    router.push(`/teacher/rooms/${roomId}/results/${result.studentId}`)
                  }
                  className="animate-enter flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50"
                  style={{ '--index': 3 + i }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold uppercase text-zinc-700">
                    {result.student?.name?.charAt(0) || '?'}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {result.student?.name || 'Номаълум'}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {result.score}/{result.totalPoints}
                  </span>
                  <Badge
                    variant={result.percentage >= 60 ? 'default' : 'destructive'}
                    className="min-w-[52px] justify-center font-mono"
                  >
                    {result.percentage}%
                  </Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
