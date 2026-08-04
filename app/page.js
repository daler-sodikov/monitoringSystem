'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoMark } from '@/components/logo-mark';
import { LoadingScreen } from '@/components/loading-screen';
import { Bot, Shuffle, BarChart3, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const features = [
  {
    icon: Bot,
    title: 'Генератсия бо AI',
    text: 'Саволҳо аз мавзӯъ ё аз ҳуҷҷати боркардашуда, дар чанд сония',
  },
  {
    icon: Shuffle,
    title: 'Вариантҳои тасодуфӣ',
    text: 'Ҳар як донишҷӯ варианти худро мегирад, нусхабардорӣ маҳал аст',
  },
  {
    icon: BarChart3,
    title: 'Натиҷаҳои фаврӣ',
    text: 'Баҳогузории автоматӣ вақте ки ҳуҷра пӯшида мешавад',
  },
];

export default function Home() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  useEffect(() => {
    checkAuth();
  }, [router]);

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

  if (authChecking) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-[1.05fr_1fr]">
      {/* Бренд панел */}
      <div className="relative hidden flex-col justify-between bg-zinc-950 p-10 text-zinc-100 md:flex lg:p-14">
        <div className="animate-enter flex items-center gap-3" style={{ '--index': 0 }}>
          <LogoMark />
          <span className="text-sm font-medium tracking-wide text-zinc-400">
            Платформаи тестӣ
          </span>
        </div>

        <div className="max-w-md">
          <h1
            className="animate-enter text-4xl font-semibold leading-[1.05] tracking-tighter lg:text-5xl"
            style={{ '--index': 1 }}
          >
            Тестҳоро созед.
            <br />
            <span className="text-emerald-400">Донишро санҷед.</span>
          </h1>
          <p
            className="animate-enter mt-5 text-base leading-relaxed text-zinc-400"
            style={{ '--index': 2 }}
          >
            Вариантҳои тасодуфӣ, ҳуҷраҳои зинда, баҳогузории автоматӣ ва
            генератсияи саволҳо бо ёрии AI. Ҳама дар як ҷой.
          </p>

          <div className="mt-10 space-y-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="animate-enter flex items-start gap-4"
                style={{ '--index': 3 + i }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-400">
                  <feature.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{feature.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="animate-enter font-mono text-xs text-zinc-600" style={{ '--index': 6 }}>
          KIMI AI · VARIANTS · AUTOGRADING
        </p>
      </div>

      {/* Форма */}
      <div className="flex items-center justify-center px-4 py-10 md:px-10">
        <div className="w-full max-w-sm">
          <div className="animate-enter mb-8 flex items-center gap-3 md:hidden" style={{ '--index': 0 }}>
            <LogoMark />
            <span className="text-sm font-medium text-muted-foreground">
              Платформаи тестӣ
            </span>
          </div>

          <h2 className="animate-enter text-2xl font-semibold tracking-tight" style={{ '--index': 1 }}>
            Воридшавӣ
          </h2>
          <p className="animate-enter mt-1.5 text-sm text-muted-foreground" style={{ '--index': 2 }}>
            Барои идома почта ва рамзи худро ворид кунед
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="animate-enter space-y-2" style={{ '--index': 3 }}>
              <Label htmlFor="email">Почтаи электронӣ</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
              />
            </div>
            <div className="animate-enter space-y-2" style={{ '--index': 4 }}>
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
            <div className="animate-enter" style={{ '--index': 5 }}>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? 'Дар ҳоли вуруд...' : 'Ворид шудан'}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          <p className="animate-enter mt-10 text-center text-xs leading-relaxed text-muted-foreground" style={{ '--index': 6 }}>
            Ҳисоб надоред? Аз администратор ё муаллими худ дастрасӣ талаб кунед.
          </p>
        </div>
      </div>
    </div>
  );
}
