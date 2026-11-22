"use client";
/**
 * Turns rendered ID-card DOM nodes into PNG / PDF files.
 * Single source of truth: the same React card is used for preview and export.
 */
import { toJpeg, toPng } from "html-to-image";
import { CARD_H, CARD_W } from "./id-card";

const PIXEL_RATIO = 3; // ≈ 480 dpi at CR80 size — crisp QR codes and text

async function ready(node: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(
    [...node.querySelectorAll("img")].map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); }),
    ),
  );
}

export async function nodeToPng(node: HTMLElement) {
  await ready(node);
  return toPng(node, { pixelRatio: PIXEL_RATIO, cacheBust: true, width: CARD_W, height: CARD_H });
}

async function nodeToJpeg(node: HTMLElement) {
  await ready(node);
  return toJpeg(node, { pixelRatio: PIXEL_RATIO, quality: 0.93, backgroundColor: "#ffffff", cacheBust: true, width: CARD_W, height: CARD_H });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

const CARD_MM = { w: 54, h: 85.6 };

/** One student: 2-page PDF (front, back) at real card size. */
export async function singleCardPdf(front: HTMLElement, back: HTMLElement, filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: [CARD_MM.w, CARD_MM.h], orientation: "portrait" });
  doc.addImage(await nodeToJpeg(front), "JPEG", 0, 0, CARD_MM.w, CARD_MM.h);
  doc.addPage([CARD_MM.w, CARD_MM.h], "portrait");
  doc.addImage(await nodeToJpeg(back), "JPEG", 0, 0, CARD_MM.w, CARD_MM.h);
  doc.save(filename);
}

/**
 * Print sheets: A4 pages of 3 × 3 cards with crop marks. Each fronts page is
 * followed by its backs page, mirrored left↔right, so double-sided printing
 * (flip on long edge) lines every back up with its front.
 */
export async function printSheetPdf(
  pairs: { front: HTMLElement; back: HTMLElement }[],
  filename: string,
  onProgress?: (done: number, total: number) => void,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const COLS = 3, ROWS = 3, GAP = 4;
  const pageW = 210, pageH = 297;
  const gridW = COLS * CARD_MM.w + (COLS - 1) * GAP;
  const gridH = ROWS * CARD_MM.h + (ROWS - 1) * GAP;
  const x0 = (pageW - gridW) / 2, y0 = (pageH - gridH) / 2;
  const pos = (col: number, row: number) => ({ x: x0 + col * (CARD_MM.w + GAP), y: y0 + row * (CARD_MM.h + GAP) });

  const crop = (x: number, y: number) => {
    doc.setDrawColor(170);
    doc.setLineWidth(0.1);
    const m = 2.5;
    for (const [cx, cy] of [[x, y], [x + CARD_MM.w, y], [x, y + CARD_MM.h], [x + CARD_MM.w, y + CARD_MM.h]] as const) {
      doc.line(cx - m, cy, cx - 0.8, cy); doc.line(cx + 0.8, cy, cx + m, cy);
      doc.line(cx, cy - m, cx, cy - 0.8); doc.line(cx, cy + 0.8, cx, cy + m);
    }
  };

  const perPage = COLS * ROWS;
  let done = 0;
  for (let p = 0; p < pairs.length; p += perPage) {
    const chunk = pairs.slice(p, p + perPage);
    if (p > 0) doc.addPage("a4", "portrait");
    for (const [i, pair] of chunk.entries()) {
      const { x, y } = pos(i % COLS, Math.floor(i / COLS));
      doc.addImage(await nodeToJpeg(pair.front), "JPEG", x, y, CARD_MM.w, CARD_MM.h);
      crop(x, y);
      onProgress?.(++done, pairs.length * 2);
    }
    doc.addPage("a4", "portrait");
    for (const [i, pair] of chunk.entries()) {
      const { x, y } = pos(COLS - 1 - (i % COLS), Math.floor(i / COLS)); // mirrored
      doc.addImage(await nodeToJpeg(pair.back), "JPEG", x, y, CARD_MM.w, CARD_MM.h);
      crop(x, y);
      onProgress?.(++done, pairs.length * 2);
    }
  }
  doc.save(filename);
}
