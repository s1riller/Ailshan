"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Скопировать",
  className,
  variant = "outline",
  size,
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error("clipboard", error);
      // Без доступа к буферу остаётся выделить текст вручную — он всегда показан рядом с кнопкой
      window.prompt("Скопируйте ссылку", value);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={copy} className={className}>
      {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
      {copied ? "Скопировано" : label}
    </Button>
  );
}
