'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, HelpCircle, User } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentResultDetail() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id;
  const studentId = params?.studentId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="min-h-screen flex items-center justify-center">Боршавӣ...</div>;
  }

  if (!data || !data.result) {
    return <div className="min-h-screen flex items-center justify-center">Маълумот ёфт нашуд</div>;
  }

  const { room, student, result, questions } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push(`/teacher/rooms/${roomId}/results`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Бозгашт ба натиҷаҳо
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Header Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-none shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold uppercase">
                    {student.name?.charAt(0) || <User className="h-8 w-8" />}
                 </div>
                 <div>
                    <CardTitle className="text-2xl font-bold text-indigo-900">{student.name}</CardTitle>
                    <CardDescription>{room.name} — {room.test?.title}</CardDescription>
                 </div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-indigo-600">{result.percentage}%</div>
                <Badge 
                  variant={result.percentage >= 60 ? 'default' : 'destructive'}
                  className={result.percentage >= 60 ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : ''}
                >
                  {result.percentage >= 60 ? 'Гузашт' : 'Нагузашт'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="border-t pt-4">
              <div className="flex flex-wrap gap-8 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Холҳои умумӣ</span>
                  <span className="font-bold text-lg">{result.score} / {result.totalPoints}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Санаи супоридан</span>
                  <span className="font-medium text-lg">{new Date(result.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Сатҳи дониш</span>
                  <span className="font-medium text-lg">
                    {result.percentage >= 90 ? 'Аъло' : result.percentage >= 75 ? 'Хуб' : result.percentage >= 60 ? 'Қаноатбахш' : 'Ғайриқаноатбахш'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
               Тафсилоти ҷавобҳо
               <Badge variant="secondary" className="ml-2">{questions.length} савол</Badge>
            </h2>
            {questions.map((q, idx) => (
              <Card key={q._id} className="border-none shadow-md overflow-hidden">
                <div className={`h-1.5 ${q.answer?.isCorrect ? 'bg-green-500' : q.answer ? 'bg-red-500' : 'bg-gray-300'}`} />
                <CardHeader className="pb-2 bg-white">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Саволи {idx + 1}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase">{q.type}</Badge>
                       </div>
                       <CardTitle className="text-lg font-medium leading-tight">{q.text}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                       <span className="text-sm font-bold text-gray-700">{q.points} хол</span>
                       {q.answer?.isCorrect ? (
                         <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Дуруст</Badge>
                       ) : q.answer ? (
                         <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Нодуруст</Badge>
                       ) : (
                         <Badge variant="secondary">Ҷавоб дода нашуд</Badge>
                       )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 bg-gray-50/30 pt-4">
                  {/* MULTIPLE CHOICE */}
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div className="grid gap-2">
                      {q.options.map(opt => {
                        const isSelected = q.answer?.answer === opt._id.toString();
                        return (
                          <div 
                            key={opt._id} 
                            className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                              isSelected 
                                ? opt.isCorrect 
                                  ? 'bg-green-50 border-green-300 text-green-800 shadow-sm ring-1 ring-green-200' 
                                  : 'bg-red-50 border-red-300 text-red-800 shadow-sm ring-1 ring-red-200'
                                : opt.isCorrect
                                  ? 'bg-green-50/40 border-green-200 text-green-700'
                                  : 'bg-white border-gray-200 text-gray-600'
                            }`}
                          >
                            <span className="font-medium">{opt.text}</span>
                            <div className="flex items-center gap-2">
                               {isSelected && (
                                 <span className="text-[10px] font-bold uppercase tracking-tight">
                                   {opt.isCorrect ? 'Ҷавоби шумо' : 'Интихоби нодуруст'}
                                 </span>
                               )}
                               {opt.isCorrect ? (
                                 <CheckCircle2 className="h-5 w-5 text-green-600" />
                               ) : isSelected ? (
                                 <XCircle className="h-5 w-5 text-red-600" />
                               ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* MATCHING */}
                  {q.type === 'MATCHING' && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Мутобиқати ҷуфтҳо:</p>
                      <div className="grid gap-2">
                        {q.pairs.map(pair => {
                          const userMatch = Array.isArray(q.answer?.answer) ? q.answer.answer.find(um => um.leftId === pair._id.toString()) : null;
                          const isMatchCorrect = userMatch?.rightId === pair._id.toString();
                          const matchedRight = q.pairs.find(p => p._id.toString() === userMatch?.rightId)?.right;

                          return (
                            <div key={pair._id} className={`flex items-center gap-4 p-3 bg-white rounded-lg border ${isMatchCorrect ? 'border-green-200' : 'border-red-200'}`}>
                              <div className="flex-1 font-medium">{pair.left}</div>
                              <div className="text-muted-foreground">↔</div>
                              <div className={`flex-1 font-medium text-right ${isMatchCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {matchedRight || <span className="italic text-gray-400 text-xs">Интихоб нашудааст</span>}
                              </div>
                              <div className="shrink-0">
                                {isMatchCorrect ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* OPEN */}
                  {q.type === 'OPEN' && (
                    <div className="p-4 bg-white rounded-lg border shadow-sm">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Ҷавоби донишҷӯ:</p>
                      <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded border leading-relaxed">
                        {q.answer?.answer || <span className="italic text-gray-400 font-normal">Ҷавоб дода нашудааст</span>}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50/50 p-2 rounded border border-amber-100">
                        <HelpCircle className="h-3 w-3" />
                        Саволҳои кушода бояд аз ҷониби муаллим дастӣ санҷида шаванд
                      </div>
                    </div>
                  )}

                  {!q.answer && (
                    <div className="p-6 bg-gray-50 rounded-lg border border-dashed text-center">
                       <HelpCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                       <p className="text-sm text-gray-500 font-medium">Донишҷӯ ба ин савол ҷавоб надодааст</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}