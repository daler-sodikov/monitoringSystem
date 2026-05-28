'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, X, BarChart3, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomView() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id;

  const [room, setRoom] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId) {
      checkAuth();
      loadRoom();
      loadResults();
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Дар ҳоли боргузорӣ...
        </p>
      </div>
    );
  }

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center">Ҳуҷра ёфт нашуд</div>;
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

          <div className="grid gap-6">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle>{room.name}</CardTitle>
                      <Badge variant={room.status === 'OPEN' ? 'default' : 'secondary'}>
                        {room.status === 'OPEN' ? 'КУШОДА' : 'ПЎШИДА'}
                      </Badge>
                    </div>
                    <CardDescription>{room.test?.title}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {room.status === 'OPEN' ? (
                        <>
                          <Button variant="destructive" onClick={handleCloseRoom}>
                            <X className="mr-2 h-4 w-4" />
                            Пӯшидани ҳуҷра
                          </Button>
                        </>
                    ) : (
                        <Button variant="default" onClick={() => router.push(`/teacher/rooms/${roomId}/results`)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Натиҷаҳои муфассал
                        </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Big room code display */}
                  <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Коди ҳӯҷра</p>
                      <span className="text-5xl font-black tracking-[0.3em] text-primary">{roomId}</span>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      Ин кодро бо донишҷӯён мубодила кунед, то онҳо ба сайт ворид шаванд ва кодро ворид кунанд.
                    </div>
                    <Button size="sm" variant="outline" onClick={copyRoomCode}>
                      <Copy className="mr-2 h-4 w-4" />
                      Нусха
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Истинод: 
                    <code className="bg-muted px-2 py-0.5 rounded ml-2">{typeof window !== 'undefined' ? window.location.origin : ''}/room/{roomId}</code>
                    <Button size="sm" variant="ghost" className="ml-2 h-6 px-2" onClick={copyRoomLink}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </p>
                  {room.status !== 'OPEN' && (
                    <p className="text-sm text-muted-foreground">
                      Ин ҳӯҷра пӯшида шудааст. Донишҷӯён дигар наметавонанд ҷавобҳои худро ирсол кунанд.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>Натиҷаҳо</CardTitle>
                <CardDescription>
                  {results.length === 0
                      ? 'Ҳанӯз натиҷае нест'
                      : `${results.length} донишҷӯ(ён) иштирок карданд`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {room.status === 'OPEN'
                          ? 'Интизори ҳамроҳшавии донишҷӯён ва ирсоли ҷавобҳо'
                          : 'Ҳеҷ донишҷӯе ин тестро супорида нашудааст'}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Донишҷӯ</th>
                          <th className="text-center p-3 font-semibold">Хол</th>
                          <th className="text-center p-3 font-semibold">Ҳамагӣ холҳо</th>
                          <th className="text-center p-3 font-semibold">Фоиз</th>
                          <th className="text-right p-3 font-semibold"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {results.map((result) => (
                            <tr key={result._id} className="border-b hover:bg-accent/50">
                              <td className="p-3">{result.student?.name || 'Номаълум'}</td>
                              <td className="text-center p-3 font-medium">{result.score}</td>
                              <td className="text-center p-3">{result.totalPoints}</td>
                              <td className="text-center p-3">
                                <Badge variant={result.percentage >= 60 ? 'default' : 'destructive'}>
                                  {result.percentage}%
                                </Badge>
                              </td>
                              <td className="text-right p-3">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => router.push(`/teacher/rooms/${roomId}/results/${result.studentId}`)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}