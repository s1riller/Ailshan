"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Без этой границы любая серверная ошибка показывалась гостю как пустое
 * «This page couldn't load» — без текста ошибки диагностировать было нечего.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Что-то пошло не так
          </CardTitle>
          <CardDescription>
            Страница не загрузилась. Попробуйте обновить — если ошибка повторяется, покажите текст ниже организатору.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-background p-3 text-xs text-muted-foreground">
              {error.message}
            </pre>
          ) : null}
          {error.digest ? <p className="text-xs text-muted-foreground">Код ошибки: {error.digest}</p> : null}
          <div className="grid gap-2 sm:flex">
            <Button onClick={reset} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              Попробовать снова
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">На главную</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
