'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.user.role === 'STUDENT') {
          setUser(data.user);
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Боршавӣ...</div>;
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Панели донишҷӯ</h1>
              <p className="text-muted-foreground">Хуш омадед, {user?.name}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Баромад
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Чӣ тавр тест супоридан мумкин аст</CardTitle>
              <CardDescription>Барои иштирок дар тест ин қадамҳоро иҷро кунед</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Қадами 1: Истиноди ҳуҷраро гиред</h3>
                <p className="text-sm text-muted-foreground">
                  Муаллими шумо истиноди ҳуҷраро мубодила мекунад. Он чунин хоҳад буд:
                </p>
                <code className="block bg-muted p-2 rounded text-xs">
                  https://your-domain.com/room/123456789
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Қадами 2: Истинодро клик кунед</h3>
                <p className="text-sm text-muted-foreground">
                  Ба истиноде, ки муаллими шумо додааст, клик кунед. Агар шумо ворид нашуда бошед, номи худро ворид кардан лозим мешавад.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Қадами 3: Тестро супоред</h3>
                <p className="text-sm text-muted-foreground">
                  Ба ҳамаи саволҳо ҷавоб диҳед ва пас аз анҷом "Ирсоли ҷавобҳо"-ро клик кунед. Шумо метавонед ҷавобҳои худро то лаҳзаи пӯшидани ҳуҷра тавассути муаллим тағйир диҳед.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Қадами 4: Натиҷаҳоро бинед</h3>
                <p className="text-sm text-muted-foreground">
                  Пас аз пӯшидани ҳуҷра аз ҷониби муаллим, ҷавобҳои шумо автоматикӣ санҷида мешаванд ва шумо метавонед натиҷаҳои худро бубинед.
                </p>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">Эзоҳ:</p>
                <p className="text-sm text-blue-800">
                  Ҳар як донишҷӯ варианти тасодуфии тестро мегирад. Бо ростқавлӣ ҷавоб диҳед ва кӯшиши бештари худро кунед!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}