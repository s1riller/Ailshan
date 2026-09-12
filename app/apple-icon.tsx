import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Та же монограмма, что в icon.svg, но без скругления — iOS скругляет сам
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1F1D1A",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M17 47 L32 15 L47 47" fill="none" stroke="#F3EFE8" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24.5 36 H37" fill="none" stroke="#F3EFE8" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="44.5" cy="36" r="3.2" fill="#9CAB8C" />
        </svg>
      </div>
    ),
    size,
  );
}
