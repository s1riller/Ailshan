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
        <div className="flex w-full max-w-[86cqw] flex-col items-center gap-14 px-8 text-center stage-lg:flex-row stage-lg:items-center stage-lg:justify-between stage-lg:text-left tall:flex-col tall:text-center">
          <div className="max-w-[60cqw] tall:max-w-[86cqw]">
            <h1 className="mt-6 font-serif text-[clamp(calc(6*var(--u)),4.5cqw,calc(12*var(--u)))] font-medium leading-[0.98] text-live-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-6 font-serif text-[calc(2.2*var(--t))] italic text-live-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          {qrUrl ? (
            <div className="flex shrink-0 flex-col items-center gap-5 wide:gap-3">
              <LiveQr value={qrUrl} size={260} max="46cqh" />
              <p className="max-w-[18rem] text-center text-[calc(1.1*var(--t))] leading-snug text-live-muted">
                {hint}
              </p>
            </div>
          ) : null}
        </div>
      </FluidParticlesBackground>
    </div>
  );
}
