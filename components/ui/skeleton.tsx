import { cn } from "@/lib/utils";

/** Заглушка на время загрузки — повторяет форму будущего контента, чтобы экран не прыгал */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-secondary", className)} {...props} />;
}
