import { cn } from "@/lib/utils";

type AilshanLogoMarkProps = {
  className?: string;
  animated?: boolean;
};

export function AilshanLogoMark({
  className,
  animated = true,
}: AilshanLogoMarkProps) {
  return (
    <div
      className={cn(
        "relative flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm",
        className,
      )}
      aria-label="Ailshan logo"
    >
      <svg viewBox="0 0 64 64" className="size-8" role="img" aria-hidden="true">
        <path
          d="M32 5 55 18v28L32 59 9 46V18L32 5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
          className={animated ? "animate-logo-draw" : undefined}
        />

        <path
          d="M18 22c8 0 10 7 14 7s6-7 14-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className={
            animated ? "animate-logo-draw animation-delay-200" : undefined
          }
        />

        <path
          d="M19 42c4-8 9-9 13-4 4-5 9-4 13 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className={
            animated ? "animate-logo-draw animation-delay-300" : undefined
          }
        />

        <circle
          cx="32"
          cy="32"
          r="3.5"
          fill="currentColor"
          className={animated ? "animate-logo-fill" : undefined}
        />
      </svg>
    </div>
  );
}
