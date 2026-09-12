"use client";

import { QRCodeSVG } from "qrcode.react";

/** Уголь — цвет рамки по умолчанию; цвет события заменяет его, когда задан */
const INK = "#1F1D1A";

/**
 * QR для печати: белая карточка внутри тонкой рамки цвета события.
 * Фон белый намеренно — QR должен читаться с любой бумаги и экрана.
 */
export function EventQrCode({ value, title, color }: { value: string; title?: string | null; color?: string | null }) {
  const frame = color && /^#[0-9a-f]{6}$/i.test(color) ? color : INK;

  return (
    <div className="mx-auto w-fit rounded-xl p-[3px]" style={{ background: frame }}>
      <div className="space-y-3 rounded-[10px] bg-white px-4 pb-4 pt-3 text-center text-foreground">
        {title ? <p className="mx-auto max-w-44 font-serif text-lg font-medium leading-tight">{title}</p> : null}
        <QRCodeSVG value={value} size={168} marginSize={1} fgColor={INK} bgColor="#FFFFFF" className="mx-auto" />
      </div>
    </div>
  );
}
