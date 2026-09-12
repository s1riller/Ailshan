"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type LiveScreen = { width: number; height: number };

/**
 * Сцена экрана зала. Все размеры стены считаются от неё (контейнерные
 * единицы cqw/cqh и запросы @container по пропорции), а не от окна браузера.
 *
 * Обычно сцена = окно. Если ведущий задал размер экрана вручную, сцена
 * рисуется ровно в этих пикселях и сжимается под окно неравномерно:
 * программа вывода или процессор экрана растянут картинку обратно, и
 * пропорции на экране окажутся правильными.
 */
export function LiveStage({
  screen,
  className,
  children,
}: {
  screen: LiveScreen | null;
  className?: string;
  children: ReactNode;
}) {
  const [scale, setScale] = useState<{ x: number; y: number } | null>(null);
  const width = screen?.width ?? 0;
  const height = screen?.height ?? 0;

  useEffect(() => {
    if (!width || !height) return;

    const update = () => setScale({ x: window.innerWidth / width, y: window.innerHeight / height });
    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, [width, height]);

  const style: CSSProperties | undefined = screen
    ? {
        width: screen.width,
        height: screen.height,
        transformOrigin: "top left",
        transform: scale ? `scale(${scale.x}, ${scale.y})` : undefined,
      }
    : undefined;

  return (
    <main
      className={cn("relative overflow-hidden [container-type:size]", screen ? "" : "h-screen w-screen", className)}
      style={style}
    >
      {children}
    </main>
  );
}
