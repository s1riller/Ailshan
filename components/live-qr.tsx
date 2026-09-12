"use client";

import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

/**
 * QR для экрана зала: код на светлой карточке цвета слоновой кости,
 * без рамок и подписей — подпись живёт рядом, шрифтом стены.
 *
 * `size` — сторона кода в пикселях на обычном проекторе; `max` — верхняя
 * граница в единицах CSS (например «34vh»), чтобы на низкой LED-полосе код
 * ужимался под высоту, а не вылезал за край. Ширина задаётся по content-box,
 * поэтому подложка (padding) не входит в расчёт и не сжимает сам код.
 */
export function LiveQr({
  value,
  size = 168,
  max,
  className,
}: {
  value: string;
  size?: number;
  max?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex rounded-xl bg-live-foreground p-3", className)}
      style={{ width: max ? `min(${size}px, ${max})` : `${size}px`, boxSizing: "content-box" }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        marginSize={1}
        fgColor="#121110"
        bgColor="transparent"
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}
