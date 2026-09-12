import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationForm } from "@/components/application-form";
import { Monogram } from "@/components/motion/monogram";
import { Wordmark } from "@/components/motion/wordmark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: {
    absolute: "Ailshan — фотографии гостей на экране зала",
  },
  description:
    "Гости открывают страницу по QR-коду, вы отбираете снимки, и они появляются на экране зала в тот же вечер. Для свадеб, частных и корпоративных событий.",
};

const STEPS: Array<{ number: string; title: string; text: string }> = [
  {
    number: "01",
    title: "Гость сканирует код",
    text: "Открывает страницу события с телефона, пишет несколько слов и загружает снимок — без приложения и регистрации.",
  },
  {
    number: "02",
    title: "Вы отбираете снимки",
    text: "Каждое фото проходит через вас: одно касание — и оно одобрено или отложено.",
  },
  {
    number: "03",
    title: "Экран зала показывает лучшее",
    text: "Одобренные снимки появляются на проекторе сразу, вместе с именем гостя и пожеланием.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const query = await searchParams;
  const applicationSent = query.application === "sent";

  return (
    <div className="flex min-h-screen-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Ailshan — на главную">
          <Monogram size={32} />
          <Wordmark className="text-xl" />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Войти</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 sm:px-6">
        <section className="py-14 sm:py-24">
          <div className="max-w-3xl">
            <div className="eyebrow">Для свадеб, частных и корпоративных событий</div>
            <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.05] sm:text-6xl">
              Фотографии гостей — на экране зала <em className="italic">в тот же вечер</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Гости открывают страницу по QR-коду, вы отбираете снимки, и они появляются на экране без задержки.
              Ничего устанавливать не нужно.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">Создать событие</Link>
              </Button>
              <Button asChild variant="link" className="h-11 px-0 sm:h-auto">
                <Link href="/login">Уже есть кабинет — войти</Link>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="border-t py-12 sm:py-16">
          <div className="eyebrow">Как это устроено</div>
          <h2 id="how-it-works" className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
            Три шага между гостем и экраном
          </h2>
          <ol className="mt-8 border-t">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="grid gap-2 border-b py-6 sm:grid-cols-[4rem_minmax(0,18rem)_1fr] sm:items-baseline sm:gap-6"
              >
                <span className="eyebrow tabular text-foreground">{step.number}</span>
                <h3 className="font-serif text-2xl font-medium leading-tight">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="application" aria-labelledby="application-title" className="border-t py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
            <div>
              <div className="eyebrow">Оставить заявку</div>
              <h2 id="application-title" className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
                Для агентств и площадок
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Расскажите о событии или площадке — мы ответим на указанную почту и предложим формат работы.
              </p>
            </div>
            <ApplicationForm sent={applicationSent} />
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 sm:px-6">
        <div className="pb-safe flex flex-col gap-3 border-t py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Ailshan</span>
          <nav className="flex items-center gap-5" aria-label="Служебные ссылки">
            <Link href="/dashboard/support" className="underline-offset-4 hover:text-foreground hover:underline">
              Поддержка
            </Link>
            <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
              Личный кабинет
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
