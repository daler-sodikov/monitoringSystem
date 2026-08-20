'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent } from '@/components/ui/card';
import { Info, MousePointerClick, Link2, Send, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    icon: Link2,
    title: 'Истиноди ҳуҷраро гиред',
    text: 'Муаллими шумо истиноди ҳуҷраро мубодила мекунад. Он чунин хоҳад буд:',
    code: 'https://your-domain.com/room/123456789',
  },
  {
    icon: MousePointerClick,
    title: 'Истинодро клик кунед',
    text: 'Ба истиноде, ки муаллими шумо додааст, клик кунед. Агар шумо ворид нашуда бошед, номи худро ворид кардан лозим мешавад.',
  },
  {
    icon: Send,
    title: 'Тестро супоред',
    text: 'Ба ҳамаи саволҳо ҷавоб диҳед ва пас аз анҷом "Ирсоли ҷавобҳо"-ро клик кунед. Шумо метавонед ҷавобҳои худро то лаҳзаи пӯшидани ҳуҷра тавассути муаллим тағйир диҳед.',
  },
  {
    icon: CheckCircle2,
    title: 'Натиҷаҳоро бинед',
    text: 'Пас аз пӯшидани ҳуҷра аз ҷониби муаллим, ҷавобҳои шумо автоматикӣ санҷида мешаванд ва шумо метавонед натиҷаҳои худро бубинед.',
  },
];

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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title="Панели донишҷӯ"
        subtitle={`Хуш омадед, ${user?.name}`}
        user={user}
        onUserUpdate={setUser}
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        <div className="animate-enter mb-10" style={{ '--index': 0 }}>
          <h2 className="text-3xl font-semibold tracking-tighter">
            Чӣ тавр тест супоридан мумкин аст
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            Барои иштирок дар тест ин чор қадамро иҷро кунед
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Қадамҳо */}
          <div className="lg:col-span-2">
            <div className="space-y-0 border-l-2 border-zinc-200/80">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="animate-enter relative pb-10 pl-8 last:pb-0"
                  style={{ '--index': 1 + i }}
                >
                  <span className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <step.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <h3 className="font-semibold tracking-tight">{step.title}</h3>
                  </div>
                  <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                  {step.code && (
                    <code className="mt-3 block w-fit rounded-lg border border-zinc-200/80 bg-white px-3 py-2 font-mono text-xs text-zinc-600">
                      {step.code}
                    </code>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Эзоҳи кӯтаҳ */}
          <div className="animate-enter lg:col-span-1" style={{ '--index': 5 }}>
            <Card className="border-l-[3px] border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <p className="text-sm font-semibold">Эзоҳ</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Ҳар як донишҷӯ варианти тасодуфии тестро мегирад. Бо
                  ростқавлӣ ҷавоб диҳед ва кӯшиши бештари худро кунед!
                </p>
                <div className="mt-5 space-y-2 border-t border-zinc-200/70 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Вариант</span>
                    <span className="font-medium">Тасодуфӣ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Таҳрир</span>
                    <span className="font-medium">То пӯшидани ҳуҷра</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Баҳо</span>
                    <span className="font-medium">Автоматӣ</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
