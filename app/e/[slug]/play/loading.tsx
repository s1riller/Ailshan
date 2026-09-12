import { Skeleton } from "@/components/ui/skeleton";

/** Повторяет форму страницы конкурса: заголовок, карточка команды, список игр, таблица */
export default function EventPlayLoading() {
  return (
    <main className="pb-safe min-h-screen-dvh">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:py-8">
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-9 w-40" />
          <Skeleton className="mt-5 h-4 w-1/2" />
        </div>
        <div className="space-y-3">
          <div className="space-y-2 border-b pb-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-7 w-44" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex min-h-14 items-center gap-3 border-b py-3 last:border-b-0">
              <Skeleton className="h-6 w-7" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="space-y-2 border-b pb-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-40" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex min-h-14 items-center gap-3 py-3">
              <Skeleton className="h-6 w-7" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
