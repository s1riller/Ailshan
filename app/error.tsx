"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Monogram } from "@/components/motion/monogram";
import { Button } from "@/components/ui/button";

/**
 * Граница ошибок для всего приложения — её видят и гость за столом, и
 * организатор в кабинете. Наружу уходит спокойный текст и код ошибки;
 * само сообщение показываем только в разработке, в проде оно уходит в консоль.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showMessage = process.env.NODE_ENV !== "production" && Boolean(error.message);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen-dvh items-center justify-center bg-background px-5 py-10 sm:px-6">
      <section className="w-full max-w-md">
        <Monogram size={40} />
        <h1 className="mt-6 font-serif text-3xl font-medium sm:text-4xl">Что-то пошло не так</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Страница не открылась. Попробуйте ещё раз — если ошибка повторится, обновите страницу через минуту.
        </p>
        {showMessage ? (
          <pre className="mt-5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-card p-3 text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
        {error.digest ? (
          <p className="tabular mt-5 text-xs text-muted-foreground">Код ошибки: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Button onClick={reset} className="w-full sm:w-auto">
            Попробовать снова
          </Button>
          <Button asChild variant="link" className="h-11 px-0 sm:h-auto">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
