import type { Metadata } from "next";
import Link from "next/link";

import { Monogram } from "@/components/motion/monogram";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Такой страницы нет",
};

/** Сюда чаще всего попадает гость со старым QR-кодом — без бренда и лишних кнопок */
export default function NotFound() {
  return (
    <main className="flex min-h-screen-dvh items-center justify-center bg-background px-5 py-10 sm:px-6">
      <section className="w-full max-w-md">
        <Monogram size={40} />
        <h1 className="mt-6 font-serif text-3xl font-medium sm:text-4xl">Такой страницы нет</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Возможно, событие завершено или ссылка устарела. Проверьте QR-код или спросите организатора.
        </p>
        <div className="mt-8">
          <Button asChild variant="link" className="h-11 px-0 sm:h-auto">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
