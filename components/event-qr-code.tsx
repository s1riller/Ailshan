"use client";

import { QRCodeSVG } from "qrcode.react";

export function EventQrCode({ value, title, color }: { value: string; title?: string | null; color?: string | null }) {
  return (
    <div className="inline-flex rounded-lg p-[3px]" style={{ background: color || "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)" }}>
      <div className="space-y-2 rounded-md bg-white p-3 text-center text-black">
        {title ? <p className="max-w-40 text-sm font-semibold">{title}</p> : null}
        <QRCodeSVG value={value} size={168} marginSize={2} />
      </div>
    </div>
  );
}
