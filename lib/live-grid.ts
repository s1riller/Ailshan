/**
 * Сетка экрана зала: сколько столбцов и строк выбрать под область стены,
 * чтобы снимки не превращались в полоски.
 *
 * Стена работает на чём угодно — проектор 16:9, LED-полоса 3:1, вертикальная
 * панель. Считать от ширины нельзя: на широком экране ограничивает высота.
 * Поэтому план подбирается по фактическим размерам области (их измеряет
 * клиентский компонент), а не по количеству снимков.
 */

export type GridPlan = { cols: number; rows: number; spans: Record<number, string> };

/**
 * Раздаёт растяжки так, чтобы в сетке cols×rows не осталось пустых
 * клеток: первый (самый свежий) снимок получает 2×2, дальше — по одной
 * двойной клетке на каждую недостающую. grid-auto-flow: dense заполняет
 * остальное.
 */
export function planGrid(count: number, cols: number, rows: number): GridPlan {
  const spans: Record<number, string> = {};
  let missing = cols * rows - count;
  let index = 0;

  if (missing >= 3 && rows >= 2 && cols >= 2) {
    spans[0] = "col-span-2 row-span-2";
    missing -= 3;
    index = 1;
  }

  while (missing > 0 && index < count) {
    spans[index] = "col-span-2";
    missing -= 1;
    index += 3;
  }

  return { cols, rows, spans };
}

/** Пропорции клетки, при которых снимок с телефона (3:4) или с камеры (4:3) не режется заметно */
const BAND_MIN = 0.75;
const BAND_MAX = 1.5;

/** 1 внутри полосы, дальше падает до 0 при отклонении вдвое */
function aspectFit(aspect: number) {
  const off = aspect < BAND_MIN ? Math.log2(BAND_MIN / aspect) : aspect > BAND_MAX ? Math.log2(aspect / BAND_MAX) : 0;
  return Math.max(0, 1 - off);
}

/**
 * Лучшие cols×rows под область width×height: сумма «пригодности» клеток
 * (с учётом растяжек из planGrid) — то есть показать как можно больше
 * снимков, но только пока клетки остаются похожими на фотографии.
 * План без растяжек получает небольшой бонус: ровная сетка читается лучше.
 */
export function chooseGrid(
  count: number,
  width: number,
  height: number,
  { maxCols = 10, maxRows = 4 }: { maxCols?: number; maxRows?: number } = {},
): [cols: number, rows: number] {
  if (count <= 0 || width <= 0 || height <= 0) return [1, 1];

  const minShown = Math.min(count, 3);
  let best: [number, number] = [Math.min(count, 4), 1];
  let bestScore = -Infinity;

  for (let rows = 1; rows <= maxRows; rows += 1) {
    for (let cols = 1; cols <= maxCols; cols += 1) {
      const capacity = cols * rows;
      const shown = Math.min(count, capacity);
      const empty = capacity - shown;
      // Меньше строки пустых клеток растяжки закроют; больше — уже дыры
      if (shown < minShown || empty > cols) continue;

      const cell = width / cols / (height / rows);
      const plan = planGrid(shown, cols, rows);
      // Растяжки должны закрыть все пустые клетки, иначе в сетке останутся дыры
      const covered = Object.values(plan.spans).reduce((sum, span) => sum + (span.includes("row-span-2") ? 3 : 1), 0);
      if (covered !== empty) continue;

      let score = 0;
      for (let index = 0; index < shown; index += 1) {
        const span = plan.spans[index];
        // 2×2 сохраняет пропорцию клетки, col-span-2 делает её вдвое шире
        score += aspectFit(span === "col-span-2" ? cell * 2 : cell);
      }
      if (empty === 0) score += 0.5;

      if (score > bestScore) {
        bestScore = score;
        best = [cols, rows];
      }
    }
  }

  return best;
}
