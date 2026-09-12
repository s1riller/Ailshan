"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { setLiveScreenAction } from "@/lib/actions/live";
import { cn } from "@/lib/utils";

/** Частые экраны в залах: проектор, LED-полоса, вертикальная панель */
const PRESETS: [label: string, width: number, height: number][] = [
  ["1920×1080", 1920, 1080],
  ["2080×640", 2080, 640],
  ["3840×1080", 3840, 1080],
  ["1080×1920", 1080, 1920],
];

/**
 * Разрешение экрана зала. По умолчанию стена подстраивается под окно
 * браузера на проекторе. Ручной размер нужен, когда программа вывода или
 * процессор экрана растягивают картинку на экран другой пропорции: тогда
 * стена рисуется под физический размер и сжимается под окно, а после
 * растяжения выглядит правильно.
 */
export function LiveScreenForm({
  eventId,
  width,
  height,
}: {
  eventId: string;
  width: number | null;
  height: number | null;
}) {
  const [manual, setManual] = useState(Boolean(width && height));
  const [size, setSize] = useState({ width: width ?? 1920, height: height ?? 1080 });

  return (
    <form action={setLiveScreenAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="grid gap-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
          <input type="radio" name="mode" value="auto" checked={!manual} onChange={() => setManual(false)} className="mt-1" />
          <span>
            <span className="block font-medium">Автоматически</span>
            <span className="block text-sm text-muted-foreground">По размеру окна браузера на проекторе — подходит почти всегда.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
          <input type="radio" name="mode" value="manual" checked={manual} onChange={() => setManual(true)} className="mt-1" />
          <span>
            <span className="block font-medium">Задать размер экрана</span>
            <span className="block text-sm text-muted-foreground">
              Если картинка на экране растянута или сплющена: программа вывода отдаёт один размер, а экран показывает другой.
            </span>
          </span>
        </label>
      </div>

      <div className={cn("space-y-3", !manual && "pointer-events-none opacity-40")}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([label, presetWidth, presetHeight]) => {
            const active = size.width === presetWidth && size.height === presetHeight;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setSize({ width: presetWidth, height: presetHeight })}
                className={cn(
                  "tabular rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
                  active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="screenWidth">Ширина, px</Label>
            <Input
              id="screenWidth"
              name="width"
              type="number"
              inputMode="numeric"
              min={320}
              max={8192}
              value={size.width}
              onChange={(event) => setSize((previous) => ({ ...previous, width: Number(event.target.value) }))}
              disabled={!manual}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="screenHeight">Высота, px</Label>
            <Input
              id="screenHeight"
              name="height"
              type="number"
              inputMode="numeric"
              min={240}
              max={8192}
              value={size.height}
              onChange={(event) => setSize((previous) => ({ ...previous, height: Number(event.target.value) }))}
              disabled={!manual}
            />
          </div>
        </div>
      </div>

      <SubmitButton variant="outline" pendingText="Сохраняем…" className="w-full">
        Применить к экрану
      </SubmitButton>
    </form>
  );
}
