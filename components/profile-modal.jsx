"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ProfileModal({ user, open, onOpenChange, onUpdated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPassword("");
    }
  }, [open, user]);

  async function handleSave() {
    if (!name || !email) {
      toast.error("Ном ва почта ҳатмист");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: password || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Хатогӣ рух дод");
        return;
      }

      toast.success("Маълумот бомуваффақият нав карда шуд");
      onUpdated?.(data.user);
      onOpenChange(false);
    } catch (error) {
      toast.error("Хатогӣ рух дод");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Профил</DialogTitle>
          <DialogDescription>
            Маълумоти ҳисоби худро дар ин ҷо иваз карда метавонед
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Ном</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">Почтаи электронӣ</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-password">Пароли нав</Label>
            <Input
              id="profile-password"
              type="password"
              placeholder="Бе тағйир монад — холӣ гузоред"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Бекор кардан
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Нигоҳ дошта истодааст..." : "Нигоҳ доштан"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
