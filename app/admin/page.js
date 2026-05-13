'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, LogOut, Trash2 } from 'lucide-react';
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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
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
    return <div className="min-h-screen flex items-center justify-center">Боршавӣ...</div>;
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Панели администратор</h1>
              <p className="text-muted-foreground">Хуш омадед, {user?.name}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Баромад
            </Button>
          </div>

          {/* Teachers Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Омӯзгорон</CardTitle>
                  <CardDescription>Идоракунии ҳисобҳои омӯзгорон</CardDescription>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Иловаи омӯзгор
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Сохтани ҳисоби омӯзгор</DialogTitle>
                      <DialogDescription>Иловаи омӯзгори нав ба платформа</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTeacher} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Ном</Label>
                        <Input
                            id="name"
                            value={teacherData.name}
                            onChange={(e) => setTeacherData({ ...teacherData, name: e.target.value })}
                            required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Почтаи электронӣ</Label>
                        <Input
                            id="email"
                            type="email"
                            value={teacherData.email}
                            onChange={(e) => setTeacherData({ ...teacherData, email: e.target.value })}
                            required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Рамз</Label>
                        <Input
                            id="password"
                            type="password"
                            value={teacherData.password}
                            onChange={(e) => setTeacherData({ ...teacherData, password: e.target.value })}
                            required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Сохтани омӯзгор
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Ҳанӯз омӯзгор нест</p>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Ном</th>
                        <th className="text-left p-3 font-semibold">Почтаи электронӣ</th>
                        <th className="text-right p-3 font-semibold">Амалҳо</th>
                      </tr>
                      </thead>
                      <tbody>
                      {teachers.map((teacher) => (
                          <tr key={teacher._id} className="border-b hover:bg-accent/50">
                            <td className="p-3">{teacher.name}</td>
                            <td className="p-3">{teacher.email}</td>
                            <td className="p-3 text-right">
                              <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteTeacher(teacher._id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
  );
}