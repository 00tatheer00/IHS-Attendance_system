/**
 * Student ID card, drawn directly as a vector PDF (CR80 portrait, 54 × 85.6 mm).
 *
 * - Text and the QR code are vectors: razor-sharp at any print resolution.
 * - The QR uses error-correction level Q (25 % recoverable) so smudged or
 *   slightly damaged prints still scan.
 * - The on-screen preview renders this same PDF, so screen = print.
 *
 * Pure module: runs in the browser and in Node (see scripts/test-card.mts).
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { INSTITUTE, QR_PREFIX } from "@/config/institute";
import type { Gender } from "@/lib/types";

export interface CardStudent {
  id: string;
  roll_no: string;
  full_name: string;
  father_name: string | null;
  gender: Gender | null;
  qr_token: string;
  photoUrl?: string | null;
  department: string; // "Cardiology"
  batch: string; // "Batch 3"
  session: string | null; // "2026–2030"
}

/** Images as data URLs (PNG/JPEG). */
export interface CardAssets {
  logo: string;
  avatars: Record<"male" | "female" | "neutral", string>;
  photos?: Map<string, string>; // student id → data URL
}

export const CARD = { w: 54, h: 85.6 } as const;

type RGB = [number, number, number];
const C = {
  indigo: [46, 26, 138] as RGB,
  indigoDeep: [27, 14, 92] as RGB,
  indigoSoft: [238, 235, 250] as RGB,
  indigoLine: [222, 217, 245] as RGB,
  gold: [201, 162, 39] as RGB,
  ink: [27, 21, 48] as RGB,
  muted: [107, 101, 133] as RGB,
  white: [255, 255, 255] as RGB,
};

export const qrText = (token: string) => `${QR_PREFIX}${token}`;

const fill = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2]);
const ink = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2]);
const draw = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2]);

/** Largest font size ≤ max that fits `width` (mm), never below min. */
function fitSize(d: jsPDF, text: string, width: number, max: number, min: number, style = "bold") {
  d.setFont("helvetica", style);
  for (let s = max; s >= min; s -= 0.25) {
    d.setFontSize(s);
    if (d.getTextWidth(text) <= width) return s;
  }
  return min;
}

/** Text with letter-spacing, centred on cx (jsPDF's align:center ignores charSpace). */
function spaced(d: jsPDF, text: string, cx: number, y: number, charSpace: number) {
  const w = d.getTextWidth(text) + charSpace * (text.length - 1);
  d.text(text, cx - w / 2, y, { charSpace });
}

function imageFormat(dataUrl: string) {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

/** Image cropped to cover a rounded box. */
function coverImage(d: jsPDF, dataUrl: string, alias: string, x: number, y: number, w: number, h: number, r: number) {
  const props = d.getImageProperties(dataUrl);
  const scale = Math.max(w / props.width, h / props.height);
  const iw = props.width * scale, ih = props.height * scale;
  d.saveGraphicsState();
  d.roundedRect(x, y, w, h, r, r, null);
  d.clip();
  d.discardPath();
  d.addImage(dataUrl, imageFormat(dataUrl), x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, alias, "FAST");
  d.restoreGraphicsState();
}

// ---------------------------------------------------------------------

export function drawFront(d: jsPDF, s: CardStudent, a: CardAssets, ox = 0, oy = 0) {
  const { w: W, h: H } = CARD;
  const cx = ox + W / 2;

  // Background
  fill(d, C.white);
  d.rect(ox, oy, W, H, "F");

  // Header band with a subtle diagonal facet
  fill(d, C.indigo);
  d.rect(ox, oy, W, 31, "F");
  fill(d, C.indigoDeep);
  d.triangle(ox + W * 0.45, oy, ox + W, oy, ox + W, oy + 31, "F");
  fill(d, C.indigo);
  d.triangle(ox + W * 0.62, oy, ox + W, oy, ox + W, oy + 18, "F");
  fill(d, C.gold);
  d.rect(ox, oy + 31, W, 0.7, "F");

  // Crest + institute name
  fill(d, C.white);
  d.roundedRect(ox + 3.6, oy + 3.6, 10.4, 10.4, 1.6, 1.6, "F");
  d.addImage(a.logo, imageFormat(a.logo), ox + 4.1, oy + 4.1, 9.4, 9.4, "ihs-logo", "FAST");

  ink(d, C.white);
  const title = INSTITUTE.name.toUpperCase();
  fitSize(d, title, W - 19.5, 6.6, 5);
  d.text(title, ox + 16, oy + 8);
  d.setFont("helvetica", "normal");
  d.setFontSize(5.4);
  d.setTextColor(214, 208, 245);
  d.text(INSTITUTE.affiliation, ox + 16, oy + 11.6);

  d.setFont("helvetica", "bold");
  d.setFontSize(4.6);
  d.setTextColor(214, 208, 245);
  spaced(d, "STUDENT IDENTITY CARD", cx, oy + 19.5, 0.55);

  // Photo (overlapping the band)
  const pw = 22, ph = 26.4, px = cx - pw / 2, py = oy + 22.5;
  fill(d, C.white);
  d.roundedRect(px - 1.1, py - 1.1, pw + 2.2, ph + 2.2, 2.6, 2.6, "F");
  const photo = a.photos?.get(s.id);
  const avatar = a.avatars[s.gender ?? "neutral"];
  coverImage(d, photo ?? avatar, photo ? `photo-${s.id}` : `avatar-${s.gender ?? "neutral"}`, px, py, pw, ph, 2);
  draw(d, C.indigoLine);
  d.setLineWidth(0.25);
  d.roundedRect(px, py, pw, ph, 2, 2, "S");

  // Name (auto-fit, wraps to two lines if very long)
  ink(d, C.ink);
  let nameY = oy + 55.2;
  const size = fitSize(d, s.full_name, W - 7, 10.5, 7.5);
  if (d.getTextWidth(s.full_name) > W - 7) {
    const lines = d.splitTextToSize(s.full_name, W - 7) as string[];
    d.text(lines.slice(0, 2), cx, nameY - 1.6, { align: "center", lineHeightFactor: 1.05 });
    nameY += 1.8;
  } else {
    d.setFontSize(size);
    d.text(s.full_name, cx, nameY, { align: "center" });
  }

  // Roll number pill
  d.setFont("courier", "bold");
  d.setFontSize(8.6);
  const rw = d.getTextWidth(s.roll_no) + 6;
  fill(d, C.indigoSoft);
  d.roundedRect(cx - rw / 2, nameY + 1.8, rw, 4.8, 2.4, 2.4, "F");
  ink(d, C.indigo);
  d.text(s.roll_no, cx, nameY + 5.15, { align: "center" });

  // Details
  const rows: [string, string][] = [
    ["PROGRAM", `BS ${s.department}`],
    ["BATCH", s.session ? `${s.batch}  ·  ${s.session}` : s.batch],
  ];
  if (s.father_name) rows.push(["FATHER NAME", s.father_name]);
  let y = nameY + 11.6;
  for (const [label, value] of rows) {
    d.setFont("helvetica", "bold");
    d.setFontSize(4.3);
    ink(d, C.muted);
    d.text(label, ox + 6, y, { charSpace: 0.25 });
    ink(d, C.ink);
    fitSize(d, value, W - 25, 6.6, 5);
    d.text(value, ox + 22, y);
    y += 4.1;
  }

  // Footer
  fill(d, C.indigo);
  d.rect(ox, oy + H - 5.2, W, 5.2, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(4.6);
  ink(d, C.white);
  spaced(d, `${INSTITUTE.city.toUpperCase()}  ·  ${INSTITUTE.shortName}`, cx, oy + H - 1.85, 0.5);
}

export function drawBack(d: jsPDF, s: CardStudent, ox = 0, oy = 0) {
  const { w: W, h: H } = CARD;
  const cx = ox + W / 2;

  fill(d, C.white);
  d.rect(ox, oy, W, H, "F");
  fill(d, C.indigo);
  d.rect(ox, oy, W, 2.4, "F");
  fill(d, C.gold);
  d.rect(ox, oy + 2.4, W, 0.5, "F");

  d.setFont("helvetica", "bold");
  d.setFontSize(5);
  ink(d, C.muted);
  spaced(d, "SCAN FOR ATTENDANCE", cx, oy + 8.4, 0.6);

  // QR code — vector modules on white with a 4-module quiet zone
  const qr = QRCode.create(qrText(s.qr_token), { errorCorrectionLevel: "Q" });
  const n = qr.modules.size;
  const size = 30;
  const m = size / n;
  const quiet = 4 * m;
  const boxTop = oy + 11;
  const qx = cx - size / 2, qy = boxTop + quiet;
  fill(d, C.white);
  draw(d, C.indigoLine);
  d.setLineWidth(0.3);
  d.roundedRect(qx - quiet, boxTop, size + 2 * quiet, size + 2 * quiet, 2.4, 2.4, "FD");
  fill(d, C.ink);
  for (let r = 0; r < n; r++) {
    // merge horizontal runs into single rects (smaller file, no hairline gaps)
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue; }
      let e = c;
      while (e + 1 < n && qr.modules.get(r, e + 1)) e++;
      d.rect(qx + c * m, qy + r * m, (e - c + 1) * m + 0.01, m + 0.01, "F");
      c = e + 1;
    }
  }
  const below = boxTop + size + 2 * quiet; // bottom edge of the QR box

  // Identity under the code
  d.setFont("courier", "bold");
  d.setFontSize(10);
  ink(d, C.indigo);
  d.text(s.roll_no, cx, below + 5.2, { align: "center" });
  ink(d, C.ink);
  fitSize(d, s.full_name, W - 8, 7, 5.5);
  d.text(s.full_name, cx, below + 9, { align: "center" });

  // One-line instruction
  d.setFont("helvetica", "normal");
  ink(d, C.muted);
  const hint = "Show this code to the teacher's camera in every class.";
  fitSize(d, hint, W - 8, 4.8, 3.8, "normal");
  d.text(hint, cx, below + 12.8, { align: "center" });

  // Return notice + validity + signature
  draw(d, C.indigoLine);
  d.setLineWidth(0.2);
  d.line(ox + 5, oy + H - 17, ox + W - 5, oy + H - 17);
  d.setFontSize(4.2);
  ink(d, C.muted);
  const notice = `This card is the property of the ${INSTITUTE.name}. If found, please return to ${INSTITUTE.address}${INSTITUTE.phone ? ` · ${INSTITUTE.phone}` : ""}.`;
  d.text(d.splitTextToSize(notice, W - 10) as string[], cx, oy + H - 14.2, { align: "center", lineHeightFactor: 1.25 });

  if (s.session) {
    d.setFont("helvetica", "bold");
    d.setFontSize(5);
    ink(d, C.ink);
    d.text(`VALID ${s.session}`, ox + 5, oy + H - 5.6, { charSpace: 0.2 });
  }
  draw(d, C.muted);
  d.setLineWidth(0.15);
  d.line(ox + W - 21, oy + H - 6.6, ox + W - 5, oy + H - 6.6);
  d.setFont("helvetica", "normal");
  d.setFontSize(3.8);
  ink(d, C.muted);
  d.text("Authorised signature", ox + W - 13, oy + H - 4.6, { align: "center" });

  fill(d, C.indigo);
  d.rect(ox, oy + H - 2.4, W, 2.4, "F");
}

// ---------------------------------------------------------------------

function newDoc(format: "card" | "a4") {
  const d = format === "card" ? new jsPDF({ unit: "mm", format: [CARD.w, CARD.h], orientation: "portrait" }) : new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  d.setProperties({ title: "IHS Student ID Card", creator: `${INSTITUTE.shortName} Attendance` });
  return d;
}

/** One student: page 1 = front, page 2 = back, at real card size. */
export function buildCardPdf(s: CardStudent, a: CardAssets) {
  const d = newDoc("card");
  drawFront(d, s, a);
  d.addPage([CARD.w, CARD.h], "portrait");
  drawBack(d, s);
  return d;
}

/**
 * Print sheets: A4 pages with 3 × 3 cards and crop marks. Each fronts page is
 * followed by its backs page mirrored left↔right, so printing double-sided
 * (flip on long edge) lines every back up with its front.
 */
export function buildSheetPdf(students: CardStudent[], a: CardAssets) {
  const d = newDoc("a4");
  const COLS = 3, ROWS = 3, GAP = 4;
  const gridW = COLS * CARD.w + (COLS - 1) * GAP, gridH = ROWS * CARD.h + (ROWS - 1) * GAP;
  const x0 = (210 - gridW) / 2, y0 = (297 - gridH) / 2;
  const pos = (col: number, row: number) => ({ x: x0 + col * (CARD.w + GAP), y: y0 + row * (CARD.h + GAP) });
  const crop = (x: number, y: number) => {
    d.setDrawColor(160);
    d.setLineWidth(0.1);
    for (const [px, py] of [[x, y], [x + CARD.w, y], [x, y + CARD.h], [x + CARD.w, y + CARD.h]] as const) {
      d.line(px - 3, py, px - 0.8, py); d.line(px + 0.8, py, px + 3, py);
      d.line(px, py - 3, px, py - 0.8); d.line(px, py + 0.8, px, py + 3);
    }
  };
  const per = COLS * ROWS;
  for (let p = 0; p < students.length; p += per) {
    const chunk = students.slice(p, p + per);
    if (p > 0) d.addPage("a4", "portrait");
    chunk.forEach((s, i) => { const { x, y } = pos(i % COLS, Math.floor(i / COLS)); drawFront(d, s, a, x, y); crop(x, y); });
    d.addPage("a4", "portrait");
    chunk.forEach((s, i) => { const { x, y } = pos(COLS - 1 - (i % COLS), Math.floor(i / COLS)); drawBack(d, s, x, y); crop(x, y); });
  }
  return d;
}
