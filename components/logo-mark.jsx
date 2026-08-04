import { cn } from "@/lib/utils";

export function LogoMark({ className }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M3 4.5h10" />
        <path d="M3 8h7" />
        <path d="M3 11.5h4" />
        <path d="M10.5 12l1.75 1.75L15.5 10.5" />
      </svg>
    </span>
  );
}
