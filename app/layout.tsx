import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Golos_Text } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

// Антиква для заголовков, счётчиков и всего, что написано человеком;
// гротеск с родной кириллицей — для интерфейса. Inter ушёл.
const serif = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Ailshan",
    template: "%s — Ailshan",
  },
  description: "Фотографии гостей на экране зала в тот же вечер. Страница события, живая галерея и командные игры для свадеб и частных событий.",
  applicationName: "Ailshan",
  appleWebApp: {
    capable: true,
    title: "Ailshan",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    siteName: "Ailshan",
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#F7F4EE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
