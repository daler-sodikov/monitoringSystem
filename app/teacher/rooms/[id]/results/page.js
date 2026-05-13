'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, ChevronRight, BarChart3, Users, Award, Percent } from 'lucide-react';
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
    return <div className="min-h-screen flex items-center justify-center">Боршавӣ...</div>;
  }

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center">Ҳуҷра ёфт нашуд</div>;
  }

  const averageScore = results.length > 0 
    ? (results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length).toFixed(1)
    : 0;
  
  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;

  const passCount = results.filter(r => r.percentage >= 60).length;
  const passRate = results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push(`/teacher/rooms/${roomId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Бозгашт ба ҳуҷра
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Натиҷаҳои тест</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/50 backdrop-blur-sm border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Иштирокчиён</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 backdrop-blur-sm border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Миёнаи холҳо</p>
                  <p className="text-2xl font-bold">{averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Баландтарин</p>
                  <p className="text-2xl font-bold">{highestScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full text-green-600">
                  <Percent className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Гузаштанд</p>
                  <p className="text-2xl font-bold">{passRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-none shadow-xl">
          <CardHeader className="bg-white border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{room.name}</CardTitle>
                <CardDescription>Рӯйхати ҳамаи натиҷаҳои донишҷӯён</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {room.test?.title}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Донишҷӯ</th>
                    <th className="px-6 py-4 text-center font-semibold">Холҳо</th>
                    <th className="px-6 py-4 text-center font-semibold">Фоиз</th>
                    <th className="px-6 py-4 text-center font-semibold">Статус</th>
                    <th className="px-6 py-4 text-right font-semibold">Амалҳо</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                        Натиҷаҳо ҳанӯз вуҷуд надоранд
                      </td>
                    </tr>
                  ) : (
                    results.map((result) => (
                      <tr key={result._id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                              {result.student?.name?.charAt(0) || <User className="h-4 w-4" />}
                            </div>
                            <span className="font-medium text-gray-900">
                              {result.student?.name || 'Номаълум'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-700">
                          {result.score} / {result.totalPoints}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full ${result.percentage >= 60 ? 'bg-green-500' : 'bg-red-500'}`} 
                                  style={{ width: `${result.percentage}%` }}
                                ></div>
                             </div>
                             <span className="font-bold">{result.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge 
                            variant={result.percentage >= 60 ? 'default' : 'destructive'}
                            className={result.percentage >= 60 ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' : ''}
                          >
                            {result.percentage >= 60 ? 'Гузашт' : 'Нагузашт'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                            onClick={() => router.push(`/teacher/rooms/${roomId}/results/${result.studentId}`)}
                          >
                            Тафсилот
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
