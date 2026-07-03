"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { authSchema, type AuthInput } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(mode: "login" | "signup") {
    const values = form.getValues();
    const parsed = authSchema.safeParse(values);
    if (!parsed.success) {
      await form.trigger();
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword(parsed.data)
        : await supabase.auth.signUp(parsed.data);
    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(mode === "login" ? "Вы вошли" : "Аккаунт создан");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" type="email" autoComplete="email" {...field} />
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
        <div className="grid gap-2 sm:grid-cols-2">
          <Button disabled={loading} onClick={() => submit("login")} type="button">
            <LogIn className="h-4 w-4" />
            Войти
          </Button>
          <Button disabled={loading} onClick={() => submit("signup")} type="button" variant="outline">
            <UserPlus className="h-4 w-4" />
            Создать
          </Button>
        </div>
      </form>
    </Form>
  );
}
