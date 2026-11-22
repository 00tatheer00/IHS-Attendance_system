/**
 * Proves the ID-card QR codes work: builds card PDFs with the real card code,
 * rasterises them like a printer (300 dpi) and a phone camera would see them
 * (low-res, blurred), then decodes the QR with ZXing — the same decoder the
 * scanner uses on Windows/iPhone.
 * Usage: npx tsx scripts/test-card.mts [--png]   (--png writes previews to samples/)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { buildCardPdf, buildSheetPdf, qrText, type CardAssets, type CardStudent } from "../src/components/id-card/card-pdf";

prepareZXingModule({
  overrides: { wasmBinary: readFileSync("public/wasm/zxing_reader.wasm").buffer as ArrayBuffer },
  fireImmediately: true,
});

const dataUrl = (path: string) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;
const assets: CardAssets = {
  logo: dataUrl("public/ihs-logo.png"),
  avatars: { male: dataUrl("public/avatars/male.png"), female: dataUrl("public/avatars/female.png"), neutral: dataUrl("public/avatars/neutral.png") },
};

const students: CardStudent[] = [
  { id: "1", roll_no: "CAR-F26-100", full_name: "Muneeza Mansoor", father_name: "Mansoor Ahmad", gender: "female", qr_token: "3fa85f6457174562", department: "Cardiology", batch: "Batch 3", session: "2026–2030" },
  { id: "2", roll_no: "CAR-F26-53", full_name: "Muhammad Ahmad Qureshi", father_name: "Muhammad Shahab Qureshi", gender: "male", qr_token: "0c9e1b77a2d44f10", department: "Medical Lab Technology", batch: "Batch 3", session: "2026–2030" },
  { id: "3", roll_no: "EME-F26-49", full_name: "Muhammad Sulaiman Bangash Khan Yousafzai", father_name: null, gender: null, qr_token: "ffffffffffffffff", department: "Emergency", batch: "Batch 3", session: null },
];

async function render(pdfBytes: ArrayBuffer, page: number, dpi: number, blur = 0): Promise<Canvas> {
  const pdf = await getDocument({ data: new Uint8Array(pdfBytes.slice(0)), standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/" }).promise;
  const p = await pdf.getPage(page);
  const vp = p.getViewport({ scale: dpi / 72 });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // @ts-expect-error napi canvas is API-compatible with what pdf.js needs
  await p.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  if (blur) {
    const out = createCanvas(canvas.width, canvas.height);
    const o = out.getContext("2d");
    o.filter = `blur(${blur}px)`;
    o.drawImage(canvas, 0, 0);
    return out;
  }
  return canvas;
}

const decode = async (canvas: Canvas) =>
  (await readBarcodes(new Uint8Array(canvas.toBuffer("image/png")), { formats: ["QRCode"], tryHarder: true })).map((r) => r.text);

const png = process.argv.includes("--png");
if (png) mkdirSync("samples", { recursive: true });

for (const s of students) {
  const bytes = buildCardPdf(s, assets).output("arraybuffer");
  for (const [label, dpi, blur] of [["print 300dpi", 300, 0], ["phone-camera-ish 90dpi + blur", 90, 1.2]] as const) {
    const texts = await decode(await render(bytes, 2, dpi, blur));
    assert.deepEqual(texts, [qrText(s.qr_token)], `${s.roll_no} ${label}: got ${JSON.stringify(texts)}`);
  }
  console.log(`✓ ${s.roll_no}: QR decodes to "${qrText(s.qr_token)}" (print and camera quality)`);
  if (png) {
    writeFileSync(`samples/card-${s.roll_no}-front.png`, (await render(bytes, 1, 400)).toBuffer("image/png"));
    writeFileSync(`samples/card-${s.roll_no}-back.png`, (await render(bytes, 2, 400)).toBuffer("image/png"));
  }
}

const sheet = buildSheetPdf([...students, ...students, ...students, students[0]!], assets).output("arraybuffer");
const sheetDoc = await getDocument({ data: new Uint8Array(sheet.slice(0)) }).promise;
assert.equal(sheetDoc.numPages, 4); // 10 cards → 2 front pages + 2 back pages
const backs = await decode(await render(sheet, 2, 300));
assert.equal(backs.length, 9, `expected 9 QR codes on the backs page, got ${backs.length}`);
console.log(`✓ A4 sheet: 10 cards → ${sheetDoc.numPages} pages, all 9 QR codes on a backs page decode`);
if (png) writeFileSync("samples/sheet-front.png", (await render(sheet, 1, 100)).toBuffer("image/png"));
console.log("\nAll ID card checks passed.");
