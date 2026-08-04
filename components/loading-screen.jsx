import { Skeleton } from "@/components/ui/skeleton";
import { LogoMark } from "@/components/logo-mark";

export function LoadingScreen({ label = "Дар ҳоли боргузорӣ" }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex h-16 items-center border-b border-zinc-200/80 px-4 md:px-6">
        <LogoMark />
      </div>
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 md:px-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="mt-10 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-2/3" />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">{label}...</p>
      </div>
    </div>
  );
}
