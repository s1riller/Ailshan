import { Skeleton } from "@/components/ui/skeleton";

/** Повторяет каркас страницы события: шапка, лента вкладок и четыре плитки */
export default function EventLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Загружаем событие">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex gap-3">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-9 w-64 sm:h-10 sm:w-80" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <Skeleton className="h-11 w-full sm:h-10 lg:w-40" />
          <Skeleton className="h-11 w-full sm:h-10 lg:w-24" />
          <Skeleton className="h-11 w-full sm:h-10 lg:w-48" />
        </div>
      </div>

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <div className="flex w-max gap-2 md:grid md:w-full md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-[52px] w-40 rounded-lg md:w-auto" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
