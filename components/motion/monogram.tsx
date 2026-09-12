import { cn } from "@/lib/utils";

/**
 * Монограмма Ailshan — та же, что в app/icon.svg: угольный квадрат, «A» из
 * двух штрихов слоновой кости и шалфейная точка — живой кадр. Цвета берутся
 * из токенов темы, чтобы знак не спорил с бумагой страницы.
 */
const INK = "hsl(var(--foreground))";
const IVORY = "hsl(var(--live-foreground))";
const SAGE = "hsl(var(--live-accent))";

export function Monogram({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="14" fill={INK} />
      <path
        d="M17 47 L32 15 L47 47"
        fill="none"
        stroke={IVORY}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24.5 36 H37" fill="none" stroke={IVORY} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="44.5" cy="36" r="3.2" fill={SAGE} />
    </svg>
  );
}
