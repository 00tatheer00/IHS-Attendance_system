/**
 * Runs the PDF-OCR import pipeline (same grid + normalize code the browser
 * uses) over a PDF in Node and reports what it found.
 * Usage: npx tsx scripts/test-ocr.mts samples/batch3.pdf [--csv out.csv]
 */
import { readFile, writeFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { createScheduler, createWorker, PSM } from "tesseract.js";
import { detectGrid, eraseLines, wordsToCells, type OcrWord } from "../src/features/import/ocr/grid";
import { cellsToRawRows } from "../src/features/import/ocr/cells";
import { findGaps, normalizeRows, type RawRow } from "../src/features/import/normalize";

const file = process.argv[2]!;
const csvOut = process.argv.includes("--csv") ? process.argv[process.argv.indexOf("--csv") + 1] : null;
const pdf = await getDocument({ data: new Uint8Array(await readFile(file)) }).promise;

const scheduler = createScheduler();
for (let i = 0; i < 3; i++) {
  const w = await createWorker("eng");
  await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1" });
  scheduler.addWorker(w);
}

const t0 = Date.now();
const pages = await Promise.all(
  Array.from({ length: pdf.numPages }, async (_, idx) => {
    const page = await pdf.getPage(idx + 1);
    const vp = page.getViewport({ scale: 3 });
    const W = Math.floor(vp.width), H = Math.floor(vp.height);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    // @ts-expect-error napi canvas is API-compatible with what pdf.js needs
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    const img = ctx.getImageData(0, 0, W, H);
    const grid = detectGrid(img);
    if (grid.verticals.length < 4) return { page: idx + 1, rows: [] as RawRow[], skipped: true, grid };
    eraseLines(img);
    ctx.putImageData(img, 0, 0);
    const { data } = await scheduler.addJob("recognize", canvas.toBuffer("image/png"), {}, { blocks: true, text: false });
    const words: OcrWord[] = [];
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words)
      words.push({ text: w.text, ...w.bbox });
    const cells = wordsToCells(words, grid);
    const grepArg = process.argv.indexOf("--grep");
    if (grepArg > 0) for (const c of cells) if (new RegExp(process.argv[grepArg + 1]!).test(c.join(" "))) console.log(`  [p${idx + 1}]`, JSON.stringify(c));
    if (process.argv.includes("--debug"))
      for (const c of cells) if (c.filter(Boolean).length >= 2 && !cellsToRawRows([c, c, c], "").length) console.log(`  [p${idx + 1} unmatched]`, JSON.stringify(c));
    return { page: idx + 1, rows: cellsToRawRows(cells, `Page ${idx + 1}`), skipped: false, grid };
  }),
);
await scheduler.terminate();

for (const p of pages) console.log(`page ${p.page}: ${p.skipped ? "skipped" : p.rows.length + " rows"} (cols ${p.grid.verticals.length - 1}, rules ${p.grid.horizontals.length})`);
const raw = pages.flatMap((p) => p.rows);
const rows = normalizeRows(raw, {
  knownDepartments: ["CAR", "RAD", "DEN", "MLT", "EME", "SUR", "OPT"],
  existing: new Map(),
  fixCapitalisation: true,
  ocr: true,
});
const named = rows.filter((r) => r.include);
console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s · ${rows.length} roll numbers · ${named.length} students with names`);
const byDept = Object.groupBy(rows, (r) => r.department_code);
console.log(Object.entries(byDept).map(([k, v]) => `${k}:${v!.length}`).join("  "));
console.log("gaps:", findGaps(rows).join(", ") || "none");
console.log("gender unknown:", named.filter((r) => !r.gender).map((r) => r.full_name).join(" | "));
console.log("warnings:", named.filter((r) => r.warnings.some((w) => !w.startsWith("Gender"))).map((r) => `${r.roll_no} ${r.full_name}: ${r.warnings.join("; ")}`).join("\n  "));
for (const r of rows.slice(0, 15)) console.log(r.roll_no.padEnd(12), r.full_name.padEnd(28), r.father_name.padEnd(26), r.gender ?? "?");

if (csvOut) {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = ["Roll No,Name,Father Name,Gender,CNIC,Remarks", ...named.map((r) => [r.roll_no, r.full_name, r.father_name, r.gender ?? "", r.cnic, r.remarks].map(esc).join(","))];
  await writeFile(csvOut, lines.join("\n"), "utf8");
  console.log("wrote", csvOut);
}
if (process.argv.includes("--empties")) {
  console.log("EMPTY:", rows.filter((r) => !r.include).map((r) => `${r.roll_no}(${r.warnings[0]?.slice(0, 9)})`).join(" "));
}
