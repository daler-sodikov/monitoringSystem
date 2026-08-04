'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { LoadingScreen } from '@/components/loading-screen';
import { toast } from 'sonner';
import {
  ArrowRight,
  RefreshCw,
  X,
  DoorClosed,
  DoorOpen,
  Send,
} from 'lucide-react';

export default function RoomAccess() {
  const params = useParams();
  const roomId = params?.id;

  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [existingAnswers, setExistingAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Track selected left item for matching questions
  const [selectedLeft, setSelectedLeft] = useState(null);

  useEffect(() => {
    if (roomId) {
      checkAuthAndRoom();
    }
  }, [roomId]);

  async function checkAuthAndRoom() {
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.user && userData.user.role === 'STUDENT') {
          setUser(userData.user);
          await loadRoom();
          await joinRoomAndLoadQuestions();
          setLoading(false);
          return;
        }
      }

      await loadRoom();
      setShowLogin(true);
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setShowLogin(true);
      setLoading(false);
    }
  }

  async function loadRoom() {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);

        if (data.room.status === 'CLOSED') {
          await loadResult();
        }
      }
    } catch (error) {
      console.error('Load room error:', error);
    }
  }

  async function loadResult() {
    try {
      const res = await fetch(`/api/rooms/${roomId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
      }
    } catch (error) {
      console.error('Load result error:', error);
    }
  }

  async function handleStudentLogin(e) {
    e.preventDefault();

    if (!studentName.trim()) {
      toast.error('Лутфан номи худро ворид кунед');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName, roomId })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setShowLogin(false);
        await joinRoomAndLoadQuestions();
      } else {
        toast.error('Воридшавӣ муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    }
  }

  async function joinRoomAndLoadQuestions() {
    try {
      const joinRes = await fetch(`/api/rooms/${roomId}/join`, { method: 'POST' });

      if (!joinRes.ok) {
        const data = await joinRes.json();
        toast.error(data.error || 'Ҳамроҳшавӣ ба ҳуҷра муяссар нашуд');
        return;
      }

      const questionsRes = await fetch(`/api/rooms/${roomId}/questions`);
      if (questionsRes.ok) {
        const data = await questionsRes.json();
        setQuestions(data.questions || []);
        setExistingAnswers(data.answers || []);
        setSubmitted(!!data.roomStudent?.submittedAt);

        const answerMap = {};
        for (const ans of data.answers || []) {
          answerMap[ans.questionId] = ans.answer;
        }
        setAnswers(answerMap);
      }
    } catch (error) {
      console.error('Join room error:', error);
    }
  }

  function handleAnswerChange(questionId, answer) {
    setAnswers({ ...answers, [questionId]: answer });
  }

  // Handle matching interaction
  function handleMatchingClick(questionId, leftId, rightId) {
    if (submitted) return;

    const currentMatches = answers[questionId] || [];

    // Check if this left item already has a match
    const existingMatchIndex = currentMatches.findIndex(m => m.leftId === leftId);

    // Check if this right item is already taken
    const rightTaken = currentMatches.some(m => m.rightId === rightId && m.leftId !== leftId);

    if (rightTaken) {
      toast.error('Ин вариант аллакай интихоб шудааст');
      return;
    }

    let newMatches;
    if (existingMatchIndex >= 0) {
      // Update existing match
      newMatches = [...currentMatches];
      newMatches[existingMatchIndex] = { leftId, rightId };
    } else {
      // Add new match
      newMatches = [...currentMatches, { leftId, rightId }];
    }

    handleAnswerChange(questionId, newMatches);
    setSelectedLeft(null);
  }

  // Remove a match
  function removeMatch(questionId, leftId) {
    if (submitted) return;

    const currentMatches = answers[questionId] || [];
    const newMatches = currentMatches.filter(m => m.leftId !== leftId);
    handleAnswerChange(questionId, newMatches);
  }

  // Get matched right ID for a left item
  function getMatchedRightId(questionId, leftId) {
    const matches = answers[questionId] || [];
    const match = matches.find(m => m.leftId === leftId);
    return match?.rightId;
  }

  // Check if a right item is already matched
  function isRightMatched(questionId, rightId) {
    const matches = answers[questionId] || [];
    return matches.some(m => m.rightId === rightId);
  }

  // Reset all matches for a question
  function resetMatches(questionId) {
    if (submitted) return;
    handleAnswerChange(questionId, []);
    setSelectedLeft(null);
  }

  async function handleSubmit() {
    if (!confirm('Шумо мутмаин ҳастед, ки ҷавобҳои худро ирсол мекунед?')) return;

    const answerArray = Object.keys(answers).map(questionId => ({
      questionId,
      answer: answers[questionId]
    }));

    try {
      const res = await fetch(`/api/rooms/${roomId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray })
      });

      if (res.ok) {
        toast.success('Ҷавобҳо бомуваффақият ирсол шуданд!');
        setSubmitted(true);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Ирсоли ҷавобҳо муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!room) {
    return (
      <div className="min-h-dvh bg-background">
        <EmptyState
          icon={DoorClosed}
          title="Ҳуҷра ёфт нашуд"
          description="Ҳуҷрае, ки ҷустуҷӯ мекунед, вуҷуд надорад"
          className="pt-32"
        />
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="animate-enter" style={{ '--index': 0 }}>
            <Badge variant="secondary" className="font-mono tracking-[0.2em]">
              {roomId}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tighter">
              {room.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Барои оғози тест номи худро ворид кунед
            </p>
          </div>
          <form onSubmit={handleStudentLogin} className="animate-enter mt-6 space-y-4" style={{ '--index': 1 }}>
            <div className="space-y-2">
              <Label htmlFor="name">Номи шумо</Label>
              <Input
                id="name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Номи пурраи худро ворид кунед"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Оғози тест
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (room.status === 'CLOSED') {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title={room.name} subtitle="Ин ҳуҷраи тест пӯшида шудааст" showLogout={false} />
        <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
          {result ? (
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="animate-enter lg:col-span-1" style={{ '--index': 0 }}>
                <p className="font-mono text-7xl font-semibold tracking-tighter">
                  {result.percentage}
                  <span className="text-3xl text-muted-foreground">%</span>
                </p>
                <Badge
                  variant={result.percentage >= 60 ? 'default' : 'destructive'}
                  className="mt-4"
                >
                  {result.percentage >= 60 ? 'Гузашт' : 'Нагузашт'}
                </Badge>
              </div>
              <div className="animate-enter space-y-0 border-l-2 border-zinc-200/80 lg:col-span-2" style={{ '--index': 1 }}>
                {[
                  { label: 'Холҳои гирифташуда', value: result.score },
                  { label: 'Ҳамагӣ холҳо', value: result.totalPoints },
                  { label: 'Статуси ҳуҷра', value: 'Пӯшида' },
                ].map((row, i) => (
                  <div key={row.label} className="relative flex items-baseline justify-between pb-6 pl-8 last:pb-0">
                    <span className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-zinc-300" />
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="font-mono text-2xl font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={DoorClosed}
              title="Ҳанӯз натиҷа дастрас нест"
              description="Лутфан ба муаллими худ муроҷиат кунед"
            />
          )}
        </main>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-dvh bg-background pb-28">
      <AppHeader
        title={room.name}
        subtitle={`Хуш омадед, ${user?.name}`}
        showLogout={false}
        actions={
          <Badge variant="default" className="gap-1.5">
            <span className="breathing-dot h-1.5 w-1.5 rounded-full bg-white/90" />
            КУШОДА
          </Badge>
        }
      />

      <main className="mx-auto w-full max-w-[860px] px-4 py-10">
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={question._id}
              className="animate-enter rounded-xl border border-zinc-200/80 bg-white p-5 md:p-6"
              style={{ '--index': index }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 font-mono text-xs font-semibold text-zinc-600">
                    {index + 1}
                  </span>
                  <Badge variant="secondary" className="uppercase text-[10px]">
                    {question.type.replace('_', ' ')}
                  </Badge>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {question.points} {question.points === 1 ? 'хол' : 'холҳо'}
                </span>
              </div>

              <p className="mt-3 text-base font-medium leading-snug">{question.text}</p>

              <div className="mt-5">
                {question.type === 'MULTIPLE_CHOICE' && (
                  <div className="grid gap-2">
                    {question.options?.map((option) => {
                      const selected = answers[question._id] === option._id;
                      return (
                        <label
                          key={option._id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm transition-all duration-200 ${
                            selected
                              ? 'border-primary/50 bg-accent text-accent-foreground'
                              : 'border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50'
                          } ${submitted ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${question._id}`}
                            value={option._id}
                            checked={selected}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                            disabled={submitted}
                            className="sr-only"
                          />
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              selected ? 'border-primary' : 'border-zinc-300'
                            }`}
                          >
                            {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                          </span>
                          <span>{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {question.type === 'MATCHING' && (
                  <div className="space-y-5">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetMatches(question._id)}
                        disabled={submitted}
                        className="text-muted-foreground"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Тоза кардан
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                      {/* Left column */}
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Чап
                        </h3>
                        {question.lefts?.map((left) => {
                          const matchedRightId = getMatchedRightId(question._id, left.id);
                          const isSelected = selectedLeft === left.id;

                          return (
                            <div
                              key={left.id}
                              onClick={() => !submitted && !matchedRightId && setSelectedLeft(left.id)}
                              className={`
                                rounded-lg border p-3.5 text-sm transition-all duration-200
                                ${matchedRightId
                                  ? 'border-primary/40 bg-accent text-accent-foreground'
                                  : isSelected
                                    ? 'border-primary/60 bg-accent/60 ring-1 ring-primary/30 cursor-pointer'
                                    : 'border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer'
                                }
                                ${submitted && 'opacity-75 cursor-not-allowed'}
                              `}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{left.text}</span>
                                {matchedRightId && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    Пайваст шуд
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right column */}
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Рост
                        </h3>
                        {question.rights?.map((right) => {
                          const isMatched = isRightMatched(question._id, right.id);
                          const isAvailable = !isMatched && selectedLeft;

                          return (
                            <div
                              key={right.id}
                              onClick={() => {
                                if (submitted) return;
                                if (selectedLeft && !isMatched) {
                                  handleMatchingClick(question._id, selectedLeft, right.id);
                                }
                              }}
                              className={`
                                rounded-lg border p-3.5 text-sm transition-all duration-200
                                ${isMatched
                                  ? 'border-zinc-200/60 bg-zinc-50 text-muted-foreground/70'
                                  : isAvailable
                                    ? 'border-primary/50 bg-accent cursor-pointer hover:ring-1 hover:ring-primary/30'
                                    : 'border-dashed border-zinc-300 text-muted-foreground'
                                }
                              `}
                            >
                              <span>{right.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {answers[question._id]?.length > 0 && (
                      <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-3.5">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Пайвастҳои ҷорӣ
                        </h4>
                        <div className="mt-2.5 space-y-1.5">
                          {answers[question._id].map((match, idx) => {
                            const leftText = question.lefts?.find(l => l.id === match.leftId)?.text;
                            const rightText = question.rights?.find(r => r.id === match.rightId)?.text;
                            return (
                              <div key={idx} className="flex items-center gap-2.5 text-sm">
                                <span className="rounded-md bg-white px-2 py-1 font-medium shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
                                  {leftText}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="rounded-md bg-accent px-2 py-1 font-medium text-accent-foreground">
                                  {rightText}
                                </span>
                                {!submitted && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeMatch(question._id, match.leftId)}
                                    className="ml-auto h-6 w-6 text-muted-foreground hover:text-destructive"
                                    aria-label="Хориҷ кардан"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <ol className="list-decimal space-y-1 pl-5 font-mono text-xs leading-relaxed text-muted-foreground">
                      <li>Элементи чапро клик кунед</li>
                      <li>Элементи ростро клик кунед, то пайваст кунед</li>
                      <li>Барои нест кардан, нишонаи X-ро дар пайвастҳо пахш кунед</li>
                    </ol>
                  </div>
                )}

                {question.type === 'OPEN' && (
                  <Textarea
                    value={answers[question._id] || ''}
                    onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                    placeholder="Ҷавоби худро дар инҷо нависед..."
                    rows={4}
                    disabled={submitted}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Панели ирсол */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[860px] items-center gap-4 px-4">
          {submitted ? (
            <div className="flex w-full items-center gap-3">
              <span className="breathing-dot h-2 w-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-semibold">Ҷавобҳо ирсол шуданд</p>
                <p className="text-xs text-muted-foreground">
                  Ҷавобҳои шумо сабт карда шуданд
                </p>
              </div>
            </div>
          ) : (
            <>
              <span className="font-mono text-sm text-muted-foreground">
                {answeredCount}/{questions.length} ҷавоб дода шуд
              </span>
              <Button onClick={handleSubmit} className="ml-auto" size="lg">
                <Send className="h-4 w-4" />
                Ирсоли ҷавобҳо
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
