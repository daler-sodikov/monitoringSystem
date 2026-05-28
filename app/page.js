'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true); // for initial auth check
  const [submitting, setSubmitting] = useState(false);    // for form submissions
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', role: 'STUDENT' });

  useEffect(() => {
    checkAuth();
  }, [router]); // added router to deps

  async function checkAuth() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          redirectByRole(data.user.role);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Auth check timed out');
      } else {
        console.error('Auth check error:', error);
      }
    } finally {
      setAuthChecking(false);
    }
  }

  function redirectByRole(role) {
    if (role === 'ADMIN') router.push('/admin');
    else if (role === 'TEACHER') router.push('/teacher');
    else router.push('/student');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Вуруд бомуваффақият иҷро шуд!');
        redirectByRole(data.user.role);
      } else {
        toast.error(data.error || 'Хатогӣ ҳангоми вуруд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Ҳисоб бомуваффақият сохта шуд!');
        redirectByRole(data.user.role);
      } else {
        toast.error(data.error || 'Хатогӣ ҳангоми сабти ном');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    } finally {
      setSubmitting(false);
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-lg">Дар ҳоли боргузорӣ...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Платформаи тестӣ</CardTitle>
          <CardDescription className="text-center">
            Барои оғоз ба ҳисоби худ ворид шавед ё сабти ном кунед
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">


            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Почтаи электронӣ</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Почтаи худро ворид кунед"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Рамз</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Рамзи худро ворид кунед"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Дар ҳоли вуруд...' : 'Ворид шудан'}
                </Button>
              </form>
            </TabsContent>


          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}