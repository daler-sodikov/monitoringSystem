'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

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
    return <div className="min-h-screen flex items-center justify-center">Боршавӣ...</div>;
  }

  if (!test) {
    return <div className="min-h-screen flex items-center justify-center">Тест ёфт нашуд</div>;
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => router.push('/teacher')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Бозгашт ба панели идоракунӣ
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{test.title}</CardTitle>
              <CardDescription>{test.description || 'Тавсиф нест'}</CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {test.variants?.map((variant, variantIndex) => (
                <Card key={variant._id}>
                  <CardHeader>
                    <CardTitle className="text-xl">{variant.name}</CardTitle>
                    <CardDescription>
                      {variant.questions?.length || 0} савол(ҳо)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {variant.questions?.map((question, questionIndex) => (
                          <Card key={question._id} className="bg-accent/30">
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-semibold">
                                    Савол {questionIndex + 1}: {question.text}
                                  </h4>
                                  <div className="flex gap-2">
                                    <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                                    <Badge>{question.points} хол(ҳо)</Badge>
                                  </div>
                                </div>

                                {question.type === 'MULTIPLE_CHOICE' && (
                                    <div className="space-y-2 ml-4">
                                      <p className="text-sm font-medium">Интихобҳо:</p>
                                      {question.options?.map((option, optIndex) => (
                                          <div key={option._id} className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {String.fromCharCode(65 + optIndex)}. {option.text}
                                  </span>
                                            {option.isCorrect && (
                                                <Badge variant="default" className="text-xs">Дуруст</Badge>
                                            )}
                                          </div>
                                      ))}
                                    </div>
                                )}

                                {question.type === 'MATCHING' && (
                                    <div className="space-y-2 ml-4">
                                      <p className="text-sm font-medium">Ҷуфтҳо:</p>
                                      {question.pairs?.map((pair, pairIndex) => (
                                          <div key={pair._id} className="text-sm">
                                            {pairIndex + 1}. {pair.left} ↔ {pair.right}
                                          </div>
                                      ))}
                                    </div>
                                )}

                                {question.type === 'OPEN' && (
                                    <p className="text-sm text-muted-foreground ml-4 italic">
                                      Саволи кушод (ҷавоби матнӣ лозим аст)
                                    </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </div>
  );
}