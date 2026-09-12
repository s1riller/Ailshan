import { Skeleton } from "@/components/ui/skeleton";

/** Повторяет форму гостевой страницы: заголовок, окно камеры, два поля */
export default function GuestEventLoading() {
  return (
    <main className="pb-safe min-h-screen-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-6 aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="mt-3 h-11 w-full rounded-lg" />
          <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="mt-5 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="mt-5 h-12 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
