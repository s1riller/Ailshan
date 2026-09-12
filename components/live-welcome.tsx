"use client";

import { LiveQr } from "@/components/live-qr";
import { FluidParticlesBackground } from "@/components/ui/fluid-particles-background";

/**
 * Заставка экрана зала: живой фон из частиц, название события и QR-код для
 * загрузки снимков. Включается сама, пока фотографий нет, и по желанию
 * ведущего — из кабинета.
 */
export function LiveWelcome({
  title,
  subtitle,
  qrUrl,
  hint = "Наведите камеру, чтобы добавить снимок",
}: {
  title: string;
  subtitle?: string | null;
  qrUrl: string | null;
  hint?: string;
}) {
  return (
    <div className="absolute inset-x-0 top-0 bottom-[var(--bar)]">
      <FluidParticlesBackground
        tone="dark"
        particleCount={1400}
        className="h-full bg-transparent"
      >
        <div className="flex w-full max-w-[86vw] flex-col items-center gap-14 px-8 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div className="max-w-[60vw]">
            <h1 className="mt-6 font-serif text-[7vw] font-medium leading-[0.98] text-live-foreground lg:text-[6vw]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-6 font-serif text-[2.2vw] italic text-live-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          {qrUrl ? (
            <div className="flex shrink-0 flex-col items-center gap-5">
              <LiveQr value={qrUrl} size={260} />
              <p className="max-w-[18rem] text-center text-xl leading-snug text-live-muted">
                {hint}
              </p>
            </div>
          ) : null}
        </div>
      </FluidParticlesBackground>
    </div>
  );
}
