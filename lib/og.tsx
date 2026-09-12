import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Satori (движок next/og) не умеет системные шрифты — гарнитуру нужно отдать
 * бинарником, причём TTF: woff2 он не читает. Cormorant Garamond лежит в
 * репозитории (assets/fonts, лицензия OFL), а не тянется с Google Fonts:
 * без шрифта Satori не рисует текст вообще, и сборка в Docker без сети
 * падала на /opengraph-image. Читаем через process.cwd(), как в документации
 * next/og, — так файл попадает в трассировку standalone-сборки.
 */
const SERIF_PATH = join(process.cwd(), "assets", "fonts", "CormorantGaramond-Medium.ttf");
let serifPromise: Promise<Buffer> | null = null;

function loadSerif() {
  serifPromise ??= readFile(SERIF_PATH);
  return serifPromise;
}

export async function brandImage({
  title,
  subtitle,
  eyebrow = "Ailshan",
  accent = "#9CAB8C",
}: {
  title: string;
  subtitle?: string | null;
  eyebrow?: string;
  accent?: string;
}) {
  const serif = await loadSerif();
  const fonts = [{ name: "Cormorant", data: serif, weight: 500 as const, style: "normal" as const }];
  const fontFamily = "Cormorant";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#F7F4EE",
          color: "#1F1D1A",
          fontFamily,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: accent }} />
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#6F6960" }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: title.length > 40 ? 68 : 88, lineHeight: 1.02, letterSpacing: -1, maxWidth: 1000 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 34, color: "#6F6960" }}>{subtitle}</div> : null}
        </div>
        <div style={{ height: 1, background: "#E2DCD1", width: "100%" }} />
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
