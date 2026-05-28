'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowRight, RefreshCw, Check } from 'lucide-react';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-lg">Боршавӣ...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card>
          <CardHeader>
            <CardTitle>Ҳуҷра ёфт нашуд</CardTitle>
            <CardDescription>Ҳуҷрае, ки ҷустуҷӯ мекунед, вуҷуд надорад.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{room.name}</CardTitle>
            <CardDescription>Барои оғози тест номи худро ворид кунед</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <Label htmlFor="name">Номи шумо</Label>
                <Input
                  id="name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Номи пурраи худро ворид кунед"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Оғози тест
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (room.status === 'CLOSED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle>{room.name}</CardTitle>
                  <Badge variant="secondary">ПЎШИДА</Badge>
                </div>
                <CardDescription>Ин ҳуҷраи тест пӯшида шудааст</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="text-center py-8 space-y-4">
                    <h2 className="text-4xl font-bold">Натиҷаи шумо</h2>
                    <div className="flex justify-center gap-8 text-center">
                      <div>
                        <p className="text-3xl font-bold text-primary">{result.score}</p>
                        <p className="text-sm text-muted-foreground">Хол</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{result.totalPoints}</p>
                        <p className="text-sm text-muted-foreground">Ҳамагӣ холҳо</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-600">{result.percentage}%</p>
                        <p className="text-sm text-muted-foreground">Фоиз</p>
                      </div>
                    </div>
                    <Badge
                      variant={result.percentage >= 60 ? 'default' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      {result.percentage >= 60 ? 'Гузашт' : 'Нагузашт'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Ҳанӯз натиҷа дастрас нест. Лутфан ба муаллими худ муроҷиат кунед.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{room.name}</CardTitle>
                <CardDescription>Хуш омадед, {user?.name}</CardDescription>
              </div>
              <Badge variant="default">КУШОДА</Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Савол {index + 1} ({question.points} {question.points === 1 ? 'хол' : 'холҳо'})
                    </CardTitle>
                    <CardDescription>{question.text}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {question.type === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-2">
                    {question.options?.map((option) => (
                      <label key={option._id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                        <input
                          type="radio"
                          name={`question-${question._id}`}
                          value={option._id}
                          checked={answers[question._id] === option._id}
                          onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                          disabled={submitted}
                          className="w-4 h-4"
                        />
                        <span>{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'MATCHING' && (
                  <div className="space-y-6">
                    {/* Header with reset button */}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetMatches(question._id)}
                        disabled={submitted}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Тоза кардан
                      </Button>
                    </div>

                    {/* Matching interface */}
                    <div className="grid grid-cols-2 gap-8">
                      {/* Left column */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-blue-700 mb-2">Элементҳои чап</h3>
                        {question.lefts?.map((left) => {
                          const matchedRightId = getMatchedRightId(question._id, left.id);
                          const isSelected = selectedLeft === left.id;

                          return (
                            <div
                              key={left.id}
                              onClick={() => !submitted && !matchedRightId && setSelectedLeft(left.id)}
                              className={`
                                p-4 border-2 rounded-lg transition-all cursor-pointer
                                ${matchedRightId
                                  ? 'border-green-500 bg-green-50'
                                  : isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                }
                                ${submitted && 'opacity-75 cursor-not-allowed'}
                              `}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{left.text}</span>
                                {matchedRightId && (
                                  <Badge variant="outline" className="bg-green-100">
                                    <Check className="h-3 w-3 mr-1" />
                                    Паваст шуд
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right column */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-green-700 mb-2">Элементҳои рост</h3>
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
                                p-4 border-2 rounded-lg transition-all
                                ${isMatched
                                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : isAvailable
                                    ? 'border-blue-500 bg-blue-50 cursor-pointer hover:shadow-md'
                                    : 'border-gray-200 cursor-default'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                {isAvailable && (
                                  <ArrowRight className="h-4 w-4 text-blue-500" />
                                )}
                                <span>{right.text}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current matches summary */}
                    {answers[question._id]?.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Пайвастҳои ҷорӣ:</h4>
                        <div className="space-y-2">
                          {answers[question._id].map((match, idx) => {
                            const leftText = question.lefts?.find(l => l.id === match.leftId)?.text;
                            const rightText = question.rights?.find(r => r.id === match.rightId)?.text;
                            return (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <Badge variant="outline" className="bg-blue-100">{leftText}</Badge>
                                <ArrowRight className="h-3 w-3" />
                                <Badge variant="outline" className="bg-green-100">{rightText}</Badge>
                                {!submitted && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMatch(question._id, match.leftId)}
                                    className="h-6 px-2 text-red-500 hover:text-red-700"
                                  >
                                    ✕
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Instructions */}
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      1. Элементи чапро клик кунед<br />
                      2. Элементи ростро клик кунед, то пайваст кунед<br />
                      3. Барои нест кардан, дар пайвастҳои ҷорӣ тугмаи ✕-ро пахш кунед
                    </p>
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
              </CardContent>
            </Card>
          ))}

          {!submitted && (
            <Card>
              <CardContent className="pt-6">
                <Button onClick={handleSubmit} className="w-full" size="lg">
                  Ирсоли ҷавобҳо
                </Button>
              </CardContent>
            </Card>
          )}

          {submitted && (
            <Card className="border-green-500">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-green-600">Ҷавобҳо ирсол шуданд!</p>
                  <p className="text-muted-foreground">
                    Ҷавобҳои шумо сабт карда шуданд
                  </p>

                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}