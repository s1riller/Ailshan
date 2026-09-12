"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Кнопка отправки для форм с server action: пока запрос идёт, она заблокирована
 * и показывает состояние — второй тап подвыпившего гостя ничего не сломает.
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingText ?? "Отправляем…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
