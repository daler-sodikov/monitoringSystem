'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { LoadingScreen } from '@/components/loading-screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, FileText, Check, Pencil } from 'lucide-react';

export default function TestView() {
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
      const res = await fetch('/api/auth/me');
      if (!res.ok || !(await res.json()).user) {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
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
      console.error('Load test error:', error);
    } finally {
      setLoading(false);
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
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={test.title}
        subtitle={test.description || 'Тавсиф нест'}
        backHref="/teacher"
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        <div className="mb-6 flex justify-end">
          <Button
            size="sm"
            onClick={() => router.push(`/teacher/tests/${testId}/edit`)}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Таҳрир кардан
          </Button>
        </div>

        <div className="space-y-12">
          {test.variants?.map((variant, variantIndex) => (
            <section
              key={variant._id}
              className="animate-enter"
              style={{ '--index': variantIndex }}
            >
              {/* Сарлавҳаи вариант */}
              <div className="mb-5 flex items-baseline gap-4 border-b border-zinc-200/80 pb-4">
                <span className="font-mono text-sm font-semibold text-primary">
                  {String(variantIndex + 1).padStart(2, '0')}
                </span>
                <h2 className="text-xl font-semibold tracking-tighter">
                  {variant.name}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {variant.questions?.length || 0} савол
                </span>
              </div>

              <div className="space-y-4">
                {variant.questions?.map((question, questionIndex) => (
                  <div
                    key={question._id}
                    className="flex gap-4 rounded-xl border border-zinc-200/80 bg-white p-5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 font-mono text-xs font-semibold text-zinc-600">
                      {questionIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h4 className="font-medium leading-snug">{question.text}</h4>
                        <div className="flex shrink-0 gap-2">
                          <Badge variant="secondary" className="uppercase text-[10px]">
                            {question.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {question.points} хол
                          </Badge>
                        </div>
                      </div>

                      {question.type === 'MULTIPLE_CHOICE' && (
                        <div className="mt-4 space-y-1.5">
                          {question.options?.map((option, optIndex) => (
                            <div
                              key={option._id}
                              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${
                                option.isCorrect ? 'bg-accent text-accent-foreground' : 'text-zinc-600'
                              }`}
                            >
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                              <span className={option.isCorrect ? 'font-medium' : ''}>
                                {option.text}
                              </span>
                              {option.isCorrect && (
                                <Check className="ml-auto h-3.5 w-3.5 text-primary" strokeWidth={2} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'MATCHING' && (
                        <div className="mt-4 space-y-1.5">
                          {question.pairs?.map((pair, pairIndex) => (
                            <div key={pair._id} className="flex items-center gap-3 px-2.5 py-1.5 text-sm">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                {pairIndex + 1}
                              </span>
                              <span className="font-medium">{pair.left}</span>
                              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                              <span className="text-zinc-600">{pair.right}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'OPEN' && (
                        <p className="mt-3 text-sm italic text-muted-foreground">
                          Саволи кушод (ҷавоби матнӣ лозим аст)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
