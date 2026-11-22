"use client";
/**
 * Reads a class-list PDF in the browser.
 * - Pages with a text layer: words come straight from the PDF (fast, exact).
 * - Scanned/image pages: rendered and OCR'd with Tesseract (slower, needs review).
 * Either way the table grid is detected from the rendered page and words are
 * placed into cells, so column boundaries are exact.
 *
 * Pages are rendered one at a time (memory-friendly on phones); OCR jobs run
 * in parallel on a small worker pool.
 */
import type { Scheduler } from "tesseract.js";
import type { RawRow } from "../normalize";
import { cellsToRawRows } from "./cells";
import { detectGrid, eraseLines, wordsToCells, type OcrWord } from "./grid";

export interface PdfProgress {
  done: number;
  pages: number;
  ocr: boolean;
}

export interface PdfResult {
  rows: RawRow[];
  usedOcr: boolean;
}

const SCALE = 3;

export async function readPdf(file: File, onProgress: (p: PdfProgress) => void): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  const pages = pdf.numPages;

  let scheduler: Scheduler | null = null;
  const getScheduler = async () => {
    if (scheduler) return scheduler;
    const T = await import("tesseract.js");
    const s = T.createScheduler();
    const n = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
    await Promise.all(
      Array.from({ length: n }, async () => {
        const w = await T.createWorker("eng");
        await w.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK, preserve_interword_spaces: "1" });
        s.addWorker(w);
      }),
    );
    return (scheduler = s);
  };

  let done = 0;
  let usedOcr = false;
  const tick = () => onProgress({ done: ++done, pages, ocr: usedOcr });
  onProgress({ done: 0, pages, ocr: false });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const jobs: Promise<RawRow[]>[] = [];

  try {
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: SCALE });
      const W = (canvas.width = Math.floor(viewport.width));
      const H = (canvas.height = Math.floor(viewport.height));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const img = ctx.getImageData(0, 0, W, H);
      const grid = detectGrid(img);
      if (grid.verticals.length < 3) { tick(); continue; } // not a table page

      // 1) Text layer
      const text = await page.getTextContent();
      const words: OcrWord[] = [];
      for (const item of text.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const x = item.transform[4] as number, y = item.transform[5] as number;
        const [x0, y0] = viewport.convertToViewportPoint(x, y) as [number, number];
        const [x1, y1] = viewport.convertToViewportPoint(x + item.width, y + item.height) as [number, number];
        words.push({ text: item.str, x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) });
      }
      if (words.length >= 10) {
        jobs.push(Promise.resolve(cellsToRawRows(wordsToCells(words, grid), `Page ${i}`)));
        tick();
        continue;
      }

      // 2) Image page → OCR (queue a compressed snapshot, free the canvas for the next page)
      usedOcr = true;
      eraseLines(img);
      ctx.putImageData(img, 0, 0);
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      const s = await getScheduler();
      jobs.push(
        s.addJob("recognize", blob, {}, { blocks: true, text: false }).then(({ data }) => {
          const ocrWords: OcrWord[] = [];
          for (const b of data.blocks ?? [])
            for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) ocrWords.push({ text: w.text, ...w.bbox });
          tick();
          return cellsToRawRows(wordsToCells(ocrWords, grid), `Page ${i}`);
        }),
      );
    }
    const rows = (await Promise.all(jobs)).flat();
    return { rows, usedOcr };
  } finally {
    await (scheduler as Scheduler | null)?.terminate();
    await task.destroy();
    canvas.width = canvas.height = 0;
  }
}
