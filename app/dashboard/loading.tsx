import { Skeleton } from "@/components/ui/skeleton";

/** Повторяет форму обзора: шапка, четыре плитки, список — экран не прыгает при загрузке */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 sm:space-y-10" aria-busy="true" aria-label="Загружаем">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-64 sm:h-10 sm:w-80" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-full sm:h-10 sm:w-44" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4 sm:p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-9 w-12" />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 py-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
