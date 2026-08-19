'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { LoadingScreen } from '@/components/loading-screen';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeftRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

function StatusRail({ answer }) {
  const color = !answer
    ? 'bg-zinc-300'
    : answer.isCorrect === true
      ? 'bg-primary'
      : answer.isCorrect === false
        ? 'bg-destructive'
        : 'bg-amber-500';
  return <div className={`w-[3px] shrink-0 rounded-full ${color}`} />;
}

export default function StudentResultDetail() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id;
  const studentId = params?.studentId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (roomId && studentId) {
      checkAuth();
      loadData();
    }
  }, [roomId, studentId]);

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
      const res = await fetch(`/api/rooms/${roomId}/results/${studentId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Боркунии маълумот муяссар нашуд');
      }
    } catch (error) {
      console.error('Load detail error:', error);
      toast.error('Хатогӣ ҳангоми боркунии маълумот');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!data || !data.student || !data.questions) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <AppHeader title="Натиҷа" backHref="/teacher" showLogout={false} />
        <EmptyState icon={HelpCircle} title="Маълумот ёфт нашуд" />
      </div>
    );
  }

  const { room, student, result, questions } = data;
  // Модоме ки ҳуҷра ҳанӯз пӯшида нашудааст, натиҷа (хол/фоиз) ҳисоб карда нашудааст
  const isGraded = !!result;

  async function handleGradeQuestion(questionId, isCorrect) {
    setGrading({ questionId, isCorrect });
    try {
      const res = await fetch(`/api/rooms/${roomId}/grade/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, isCorrect })
      });
      if (res.ok) {
        toast.success(isCorrect ? 'Ҷавоб дуруст маъқул шуд' : 'Ҷавоб нодуруст маъқул шуд');
        setRefreshKey(prev => prev + 1);
      } else {
        toast.error('Хатогӣ ҳангоми ҳисоб кардан хол');
      }
    } catch (error) {
      toast.error('Хатогӣ ҳангоми ҳисоб кардан хол');
    } finally {
      setGrading(null);
    }
  }

  const hasPendingOpen = questions.some(
    (q) => q.type === 'OPEN' && q.answer && q.answer.isCorrect === null,
  );

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={student.name}
        subtitle={`${room.name} · ${room.test?.title}`}
        backHref={`/teacher/rooms/${roomId}/results`}
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        {/* Ҳолати умумӣ */}
        <div
          className="animate-enter flex flex-col gap-8 border-b border-zinc-200/80 pb-8 md:flex-row md:items-end md:justify-between"
          style={{ '--index': 0 }}
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-semibold uppercase text-white">
              {student.name?.charAt(0)}
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tighter">{student.name}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                {isGraded ? (
                  <Badge variant={result.percentage >= 60 ? 'default' : 'destructive'}>
                    {result.percentage >= 60 ? 'Гузашт' : 'Нагузашт'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Ҳуҷра ҳанӯз кушода аст</Badge>
                )}
                {hasPendingOpen && (
                  <Badge variant="secondary" className="text-amber-700 bg-amber-50">
                    Номуайян
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {isGraded ? (
            <div className="flex items-end gap-10">
              <div>
                <p className="font-mono text-4xl font-semibold tracking-tight">
                  {result.percentage}
                  <span className="text-xl text-muted-foreground">%</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Фоизи умумӣ</p>
              </div>
              <div className="space-y-1.5 border-l border-zinc-200/80 pl-6 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Холҳо</span>
                  <span className="font-mono font-medium">
                    {result.score}/{result.totalPoints}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Сана</span>
                  <span className="font-mono font-medium">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Сатҳ</span>
                  <span className="font-medium">
                    {result.percentage >= 90 ? 'Аъло' : result.percentage >= 75 ? 'Хуб' : result.percentage >= 60 ? 'Қаноатбахш' : 'Ғайриқаноатбахш'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="max-w-xs text-sm text-muted-foreground">
              Хол ва фоиз пас аз пӯшидани ҳуҷра ҳисоб карда мешавад. Дар зер
              ҷавобҳое, ки донишҷӯ то ҳол супоридааст, нишон дода шудаанд.
            </p>
          )}
        </div>

        {/* Саволҳо */}
        <section className="animate-enter mt-10" style={{ '--index': 1 }}>
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Тафсилоти ҷавобҳо
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {questions.length} савол
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q._id}
                className="animate-enter flex gap-4 rounded-xl border border-zinc-200/80 bg-white p-5"
                style={{ '--index': 2 + idx }}
              >
                <StatusRail answer={q.answer} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {q.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {q.points} хол
                      </span>
                      {q.answer?.isCorrect === true ? (
                        <Badge variant="default">Дуруст</Badge>
                      ) : q.answer?.isCorrect === false ? (
                        <Badge variant="destructive">Нодуруст</Badge>
                      ) : q.answer ? (
                        <Badge variant="secondary" className="text-amber-700 bg-amber-50">
                          Мушкили номуайян
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Ҷавоб дода нашуд</Badge>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-base font-medium leading-snug">{q.text}</p>

                  {/* MULTIPLE CHOICE */}
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div className="mt-4 grid gap-2">
                      {q.options.map(opt => {
                        const isSelected = q.answer?.answer === opt._id.toString();
                        return (
                          <div
                            key={opt._id}
                            className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                              isSelected
                                ? opt.isCorrect
                                  ? 'border-primary/40 bg-accent text-accent-foreground'
                                  : 'border-destructive/40 bg-destructive/5 text-destructive'
                                : opt.isCorrect
                                  ? 'border-primary/25 bg-accent/40 text-accent-foreground'
                                  : 'border-zinc-200/80 text-zinc-600'
                            }`}
                          >
                            <span className="font-medium">{opt.text}</span>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide">
                                  {opt.isCorrect ? 'Ҷавоби шумо' : 'Интихоби нодуруст'}
                                </span>
                              )}
                              {opt.isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                              ) : isSelected ? (
                                <XCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* MATCHING */}
                  {q.type === 'MATCHING' && (
                    <div className="mt-4 space-y-2">
                      {q.pairs.map(pair => {
                        const userMatch = Array.isArray(q.answer?.answer) ? q.answer.answer.find(um => um.leftId === pair._id.toString()) : null;
                        const isMatchCorrect = userMatch?.rightId === pair._id.toString();
                        const matchedRight = q.pairs.find(p => p._id.toString() === userMatch?.rightId)?.right;

                        return (
                          <div
                            key={pair._id}
                            className={`flex items-center gap-3 rounded-lg border bg-zinc-50/60 p-3 text-sm ${
                              isMatchCorrect ? 'border-primary/30' : 'border-destructive/30'
                            }`}
                          >
                            <span className="flex-1 font-medium">{pair.left}</span>
                            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                            <span className={`flex-1 text-right font-medium ${isMatchCorrect ? 'text-primary' : 'text-destructive'}`}>
                              {matchedRight || <span className="text-xs font-normal italic text-muted-foreground">Интихоб нашудааст</span>}
                            </span>
                            {isMatchCorrect ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                            ) : (
                              <XCircle className="h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* OPEN */}
                  {q.type === 'OPEN' && (
                    <div className="mt-4 rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ҷавоби донишҷӯ
                      </p>
                      <p className="mt-2 rounded-md border border-zinc-200/70 bg-white p-3 text-sm leading-relaxed">
                        {q.answer?.answer || <span className="italic text-muted-foreground">Ҷавоб дода нашудааст</span>}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                        <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Саволҳои кушода бояд дастӣ санҷида шаванд
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-zinc-200/70 pt-3">
                        <span className="text-xs text-muted-foreground">Баҳо диҳед:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={grading?.questionId === q._id}
                          onClick={() => handleGradeQuestion(q._id, true)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                          Дуруст
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={grading?.questionId === q._id}
                          onClick={() => handleGradeQuestion(q._id, false)}
                        >
                          <XCircle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                          Нодуруст
                        </Button>
                      </div>
                    </div>
                  )}

                  {!q.answer && q.type !== 'OPEN' && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" strokeWidth={1.5} />
                      Донишҷӯ ба ин савол ҷавоб надодааст
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
