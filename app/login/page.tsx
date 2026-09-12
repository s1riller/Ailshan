import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Monogram } from "@/components/motion/monogram";
import { Wordmark } from "@/components/motion/wordmark";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Вход организатора",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Ailshan — на главную">
          <Monogram size={32} />
          <Wordmark className="text-xl" />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:px-6 sm:pt-0">
        <section className="w-full max-w-sm">
          <div className="eyebrow">Личный кабинет</div>
          <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">Вход организатора</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            По email и паролю. Если кабинета ещё нет — создайте его здесь же.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </section>
      </main>
    </div>
  );
}
