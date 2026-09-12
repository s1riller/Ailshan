import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Satori (движок next/og) не умеет системные шрифты — гарнитуру нужно отдать
 * бинарником. Берём Cormorant Garamond с Google Fonts; старый User-Agent
 * заставляет их отдать TTF вместо woff2, который Satori не читает.
 * Если сеть недоступна — рендерим без текста, но с брендом.
 */
async function loadSerif(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&subset=cyrillic",
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:5.0)" }, cache: "force-cache" },
    ).then((response) => response.text());
    const url = css.match(/src: url\(([^)]+)\)/)?.[1];
    if (!url) return null;

    return await fetch(url, { cache: "force-cache" }).then((response) => response.arrayBuffer());
  } catch {
    return null;
  }
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
  const fonts = serif ? [{ name: "Cormorant", data: serif, weight: 500 as const, style: "normal" as const }] : [];
  const fontFamily = serif ? "Cormorant" : "serif";

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
