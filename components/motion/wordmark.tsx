import { cn } from "@/lib/utils";

/**
 * Словесный знак: «Ailshan» антиквой. С `pulse` — тихое дыхание на время
 * загрузки вместо спиннера.
 */
export function Wordmark({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "font-serif text-2xl font-medium leading-none tracking-[0.01em] text-foreground",
        pulse && "animate-pulse [animation-duration:2.4s]",
        className,
      )}
    >
      Ailshan
    </span>
  );
}
