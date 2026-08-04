import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`animate-enter flex flex-col items-center justify-center px-4 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-muted-foreground shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
