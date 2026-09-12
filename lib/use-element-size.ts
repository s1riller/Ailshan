"use client";

import { useEffect, useRef, useState } from "react";

export type ElementSize = { width: number; height: number };

/**
 * Размер содержимого элемента (без padding), обновляется через ResizeObserver.
 * До первого измерения — нули: на сервере и в первом кадре размера ещё нет,
 * компонент рисует запасной вариант, затем перестраивается.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const style = getComputedStyle(node);
      const width = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
