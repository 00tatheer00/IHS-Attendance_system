import "server-only";
import ExcelJS from "exceljs";
import type { RawRow } from "./normalize";

type Field = "roll" | "name" | "father" | "cnic" | "gender" | "phone";

const HEADER_PATTERNS: [Field, RegExp][] = [
  ["roll", /roll|reg(istration)?\s*(no|#|number)/i],
  ["father", /father|guardian|f\/?\.?\s*name|parent/i],
  ["cnic", /cnic|b-?\s*form|nic\b|id\s*card/i],
  ["gender", /gender|sex/i],
  ["phone", /phone|mobile|contact|cell|whats\s*app/i],
  ["name", /name/i], // last: "Father Name" must not match as name
];

function detectHeader(cells: string[]): Partial<Record<Field, number>> | null {
  const map: Partial<Record<Field, number>> = {};
  cells.forEach((raw, i) => {
    const text = raw.trim();
    if (!text) return;
    for (const [field, re] of HEADER_PATTERNS) {
      if (re.test(text) && map[field] === undefined) { map[field] = i; break; }
    }
  });
  return map.roll !== undefined && map.name !== undefined ? map : null;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

function tableToRows(table: string[][], sourceName: string): RawRow[] {
  const out: RawRow[] = [];
  let header: Partial<Record<Field, number>> | null = null;
  table.forEach((cells, i) => {
    const h = detectHeader(cells);
    if (h) { header = h; return; } // header rows may repeat per section
    if (!header) return;
    const get = (f: Field) => (header![f] !== undefined ? (cells[header![f]!] ?? "").trim() : "");
    const roll = get("roll");
    if (!roll) return;
    out.push({
      roll,
      name: get("name"),
      father: get("father"),
      cnic: get("cnic"),
      gender: get("gender"),
      phone: get("phone"),
      source: `${sourceName} row ${i + 1}`,
    });
  });
  return out;
}

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export async function readSpreadsheet(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = (await file.text()).replace(/^﻿/, "");
    return tableToRows(parseCsv(text), "CSV");
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const rows: RawRow[] = [];
  for (const ws of wb.worksheets) {
    const table: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const values = row.values as ExcelJS.CellValue[]; // 1-based
      table.push(values.slice(1).map(cellText));
    });
    rows.push(...tableToRows(table, ws.name));
  }
  return rows;
}
