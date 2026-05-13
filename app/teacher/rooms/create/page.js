'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateRoom() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomData, setRoomData] = useState({
    testId: '',
    name: ''
  });

  useEffect(() => {
    checkAuth();
    loadTests();
  }, []);

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

  async function loadTests() {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Load tests error:', error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!roomData.testId || !roomData.name) {
      toast.error('Лутфан тест ва номи ҳуҷраро интихоб кунед');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Ҳуҷра бомуваффақият сохта шуд!');
        router.push(`/teacher/rooms/${data.roomId}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Сохтани ҳуҷра муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => router.push('/teacher')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Бозгашт
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Сохтани ҳуҷраи нав</CardTitle>
              <CardDescription>Ҳуҷрае созед, ки донишҷӯён тавонанд тест супоранд</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="test">Интихоби тест *</Label>
                  <select
                      id="test"
                      className="w-full p-2 border rounded-md"
                      value={roomData.testId}
                      onChange={(e) => setRoomData({ ...roomData, testId: e.target.value })}
                      required
                  >
                    <option value="">-- Тестро интихоб кунед --</option>
                    {tests.map((test) => (
                        <option key={test._id} value={test._id}>
                          {test.title}
                        </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="name">Номи ҳуҷра *</Label>
                  <Input
                      id="name"
                      value={roomData.name}
                      onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                      placeholder="Масалан: Санҷиши риёзӣ - Қисми А"
                      required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Сохта истодааст...' : 'Сохтани ҳуҷра'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push('/teacher')}>
                    Бекор кардан
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}