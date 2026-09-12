"use client";

import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

/**
 * QR для экрана зала: код на светлой карточке цвета слоновой кости,
 * без рамок и подписей — подпись живёт рядом, шрифтом стены.
 */
export function LiveQr({ value, size = 168, className }: { value: string; size?: number; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl bg-live-foreground p-3", className)}>
      <QRCodeSVG value={value} size={size} marginSize={1} fgColor="#121110" bgColor="transparent" />
    </div>
  );
}
