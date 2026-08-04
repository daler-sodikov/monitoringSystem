'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { LoadingScreen } from '@/components/loading-screen';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [teacherData, setTeacherData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.user.role === 'ADMIN') {
          setUser(data.user);
          loadTeachers();
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

  async function loadTeachers() {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Load teachers error:', error);
    }
  }

  async function handleCreateTeacher(e) {
    e.preventDefault();

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData)
      });

      if (res.ok) {
        toast.success('Омӯзгор бомуваффақият сохта шуд');
        setShowDialog(false);
        setTeacherData({ name: '', email: '', password: '' });
        loadTeachers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Сохтани омӯзгор муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    }
  }

  async function deleteTeacher(teacherId) {
    if (!confirm('Шумо мутмаин ҳастед, ки ин омӯзгорро нест мекунед?')) return;

    try {
      const res = await fetch(`/api/teachers/${teacherId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Омӯзгор нест карда шуд');
        loadTeachers();
      } else {
        toast.error('Нест кардани омӯзгор муяссар нашуд');
      }
    } catch (error) {
      toast.error('Хатогӣ рӯй дод');
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title="Панели администратор"
        subtitle={`Хуш омадед, ${user?.name}`}
        userName={user?.name}
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-6">
        <div
          className="animate-enter mb-10 flex flex-col gap-4 border-b border-zinc-200/80 pb-8 sm:flex-row sm:items-end sm:gap-10"
          style={{ '--index': 0 }}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-semibold tracking-tight">
              {teachers.length}
            </span>
            <span className="text-sm text-muted-foreground">Омӯзгорон</span>
          </div>
          <div className="sm:ml-auto">
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Иловаи омӯзгор
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Сохтани ҳисоби омӯзгор</DialogTitle>
                  <DialogDescription>Иловаи омӯзгори нав ба платформа</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeacher} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ном</Label>
                    <Input
                      id="name"
                      value={teacherData.name}
                      onChange={(e) => setTeacherData({ ...teacherData, name: e.target.value })}
                      placeholder="Номи пурра"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Почтаи электронӣ</Label>
                    <Input
                      id="email"
                      type="email"
                      value={teacherData.email}
                      onChange={(e) => setTeacherData({ ...teacherData, email: e.target.value })}
                      placeholder="teacher@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Рамз</Label>
                    <Input
                      id="password"
                      type="password"
                      value={teacherData.password}
                      onChange={(e) => setTeacherData({ ...teacherData, password: e.target.value })}
                      placeholder="Рамзи муваққатӣ"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Ин рамзро ба омӯзгор хабар диҳед
                    </p>
                  </div>
                  <Button type="submit" className="w-full">
                    Сохтани омӯзгор
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <section className="animate-enter" style={{ '--index': 1 }}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Омӯзгорон
          </h2>

          {teachers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60">
              <EmptyState
                icon={Users}
                title="Ҳанӯз омӯзгор нест"
                description="Аввалин ҳисоби омӯзгорро илова кунед"
              />
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/70 rounded-xl border border-zinc-200/80 bg-white">
              {teachers.map((teacher, i) => (
                <div
                  key={teacher._id}
                  className="animate-enter flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-50"
                  style={{ '--index': 2 + i }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold uppercase text-zinc-700">
                    {teacher.name?.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{teacher.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {teacher.email}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTeacher(teacher._id)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Нест кардан"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
