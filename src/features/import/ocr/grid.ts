/**
 * Table reconstruction for scanned/image PDFs.
 *
 * 1. detectGrid  – find the table's ruling lines from long runs of dark pixels.
 * 2. eraseLines  – whiten those lines so OCR does not read them as "|" or "[".
 * 3. wordsToCells – drop every OCR'd word into the grid cell that contains it.
 *
 * Pure functions over RGBA pixel buffers, so they run in the browser and in Node tests.
 */

export interface Pixels {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const DARK = 150 * 3;
const isDark = (d: Pixels["data"], i: number) => d[i]! + d[i + 1]! + d[i + 2]! < DARK;

/** Merge sorted positions closer than `gap` into their centre. */
function cluster(positions: number[], gap = 4) {
  const out: number[] = [];
  let group: number[] = [];
  for (const p of positions) {
    if (group.length && p - group[group.length - 1]! > gap) {
      out.push(Math.round(group.reduce((a, b) => a + b, 0) / group.length));
      group = [];
    }
    group.push(p);
  }
  if (group.length) out.push(Math.round(group.reduce((a, b) => a + b, 0) / group.length));
  return out;
}

export function detectGrid({ data, width: W, height: H }: Pixels) {
  const minV = Math.max(60, Math.floor(H * 0.06));
  const minH = Math.max(80, Math.floor(W * 0.15));

  const vx: number[] = [];
  for (let x = 0; x < W; x++) {
    let run = 0, best = 0;
    for (let y = 0; y < H; y++) {
      if (isDark(data, (y * W + x) * 4)) { run++; if (run > best) best = run; } else run = 0;
    }
    if (best >= minV) vx.push(x);
  }
  const hy: number[] = [];
  for (let y = 0; y < H; y++) {
    let run = 0, best = 0;
    for (let x = 0; x < W; x++) {
      if (isDark(data, (y * W + x) * 4)) { run++; if (run > best) best = run; } else run = 0;
    }
    if (best >= minH) hy.push(y);
  }
  return { verticals: cluster(vx), horizontals: cluster(hy) };
}

/** Whitens long horizontal/vertical dark runs (table rules) in place. */
export function eraseLines({ data, width: W, height: H }: Pixels) {
  const minRunH = Math.floor(W * 0.05);
  const minRunV = 30;
  const white = (i: number) => { data[i] = data[i + 1] = data[i + 2] = 255; };
  for (let y = 0; y < H; y++) {
    let s = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && isDark(data, (y * W + x) * 4);
      if (on && s < 0) s = x;
      if (!on && s >= 0) { if (x - s > minRunH) for (let k = s; k < x; k++) white((y * W + k) * 4); s = -1; }
    }
  }
  for (let x = 0; x < W; x++) {
    let s = -1;
    for (let y = 0; y <= H; y++) {
      const on = y < H && isDark(data, (y * W + x) * 4);
      if (on && s < 0) s = y;
      if (!on && s >= 0) { if (y - s > minRunV) for (let k = s; k < y; k++) white((k * W + x) * 4); s = -1; }
    }
  }
}

/** Groups words into a [row][column] table of cell strings using the detected grid. */
export function wordsToCells(words: OcrWord[], grid: { verticals: number[]; horizontals: number[] }) {
  const { verticals: V, horizontals: Hz } = grid;
  const rows = new Map<number, Map<number, OcrWord[]>>();
  for (const w of words) {
    const cx = (w.x0 + w.x1) / 2;
    const cy = (w.y0 + w.y1) / 2;
    const r = Hz.filter((y) => y < cy).length;
    const c = V.filter((x) => x < cx).length;
    if (c === 0 || c === V.length) continue; // outside the table
    let row = rows.get(r);
    if (!row) rows.set(r, (row = new Map()));
    const cell = row.get(c) ?? [];
    cell.push(w);
    row.set(c, cell);
  }
  const ncols = V.length - 1;
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) =>
      Array.from({ length: ncols }, (_, i) =>
        (row.get(i + 1) ?? [])
          .sort((a, b) => a.x0 - b.x0)
          .map((w) => w.text)
          .join(" "),
      ),
    );
}
