"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "Скопировать" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      <Copy className="h-4 w-4" />
      {copied ? "Скопировано" : label}
    </Button>
  );
}
