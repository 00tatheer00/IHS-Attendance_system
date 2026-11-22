"use client";
import type { CardAssets, CardStudent } from "./card-pdf";

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

let shared: Promise<Omit<CardAssets, "photos">> | null = null;

/** Logo, avatars and any student photos as data URLs (photos that fail to load fall back to the avatar). */
export async function loadCardAssets(students: CardStudent[]): Promise<CardAssets> {
  shared ??= (async () => ({
    logo: await toDataUrl("/ihs-logo.png"),
    avatars: {
      male: await toDataUrl("/avatars/male.png"),
      female: await toDataUrl("/avatars/female.png"),
      neutral: await toDataUrl("/avatars/neutral.png"),
    },
  }))();
  const base = await shared;
  const photos = new Map<string, string>();
  await Promise.all(
    students
      .filter((s) => s.photoUrl)
      .map(async (s) => {
        try {
          photos.set(s.id, await toDataUrl(s.photoUrl!));
        } catch {}
      }),
  );
  return { ...base, photos };
}

/** Renders one page of a PDF to a canvas (same engine the preview and PNG export use). */
export async function renderPdfPage(bytes: ArrayBuffer, pageNo: number, canvas: HTMLCanvasElement, scale: number) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), standardFontDataUrl: "/pdfjs/standard_fonts/" });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  } finally {
    await task.destroy();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const cardFileName = (s: Pick<CardStudent, "roll_no">) => `${s.roll_no}-IHS-ID-Card`;
