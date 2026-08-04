"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";

export function AppHeader({
  title = "Платформаи тестӣ",
  subtitle,
  userName,
  backHref,
  actions,
  showLogout = true,
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(backHref)}
              aria-label="Бозгашт"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <LogoMark className="shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground md:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {userName && (
            <div className="hidden items-center gap-2.5 rounded-full border border-zinc-200/80 bg-white py-1 pl-1 pr-3.5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold uppercase text-white">
                {userName?.charAt(0)}
              </span>
              <span className="max-w-[140px] truncate text-sm font-medium">
                {userName}
              </span>
            </div>
          )}
          {showLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Баромад</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
