"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, authSchema, type AuthInput } from "@/lib/validations/auth";

type Mode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState<Mode | null>(null);
  const form = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(mode: Mode) {
    if (pending) return;

    const valid = await form.trigger();
    if (!valid) return;
    const values = authSchema.parse(form.getValues());

    setPending(mode);
    try {
      const supabase = createClient();
      const result =
        mode === "login" ? await supabase.auth.signInWithPassword(values) : await supabase.auth.signUp(values);

      if (result.error) {
        console.error("auth:", mode, result.error);
        toast.error(authErrorMessage(result.error));
        return;
      }

      // При включённом подтверждении почты Supabase не сообщает о повторной
      // регистрации ошибкой — отдаёт пользователя без identities
      if (mode === "signup" && result.data.user?.identities?.length === 0) {
        toast.error("Такой кабинет уже есть — войдите");
        return;
      }

      // При включённом подтверждении почты signUp возвращает пользователя без сессии
      if (mode === "signup" && !result.data.session) {
        toast.success("Кабинет создан", {
          description: "Подтвердите почту по ссылке из письма, затем войдите.",
        });
        form.resetField("password");
        return;
      }

      toast.success(mode === "login" ? "Добро пожаловать" : "Кабинет создан");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("auth:", mode, error);
      toast.error("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Form {...form}>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit("login");
        }}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@agency.ru" type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 pt-1">
          <Button type="submit" disabled={pending !== null} aria-busy={pending === "login"}>
            {pending === "login" ? "Входим…" : "Войти"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending !== null}
            aria-busy={pending === "signup"}
            onClick={() => void submit("signup")}
          >
            {pending === "signup" ? "Создаём кабинет…" : "Создать кабинет"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
