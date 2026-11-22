import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { getViewer } from "@/lib/auth";
import { buildReport, type Report } from "@/lib/report";
import { className, fmtDate } from "@/lib/format";
import { INSTITUTE, MIN_ATTENDANCE_PCT } from "@/config/institute";

const LETTER = { present: "P", absent: "A", excused: "L" } as const;

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role === "student") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const course = p.get("course");
  const format = p.get("format") === "pdf" ? "pdf" : "xlsx";
  const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  if (!course) return NextResponse.json({ error: "course is required" }, { status: 400 });

  const report = await buildReport(viewer.supabase, course, date(p.get("from")), date(p.get("to")));
  if (!report) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const base = `${report.offering.subject.code}-${report.offering.class.department.code}-${report.offering.class.batch.name}`.replace(/[^\w-]+/g, "-");
  const name = `${base}-attendance${report.from ? `-${report.from}` : ""}${report.to ? `-to-${report.to}` : ""}`;

  if (format === "xlsx") {
    const buf = await toExcel(report);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      },
    });
  }
  const pdf = toPdf(report);
  return new NextResponse(pdf, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"` },
  });
}

function heading(r: Report) {
  const range = r.from || r.to ? `${r.from ? fmtDate(r.from) : "Start"} – ${r.to ? fmtDate(r.to) : fmtDate(new Date())}` : "All classes to date";
  return {
    title: `${INSTITUTE.name} — Attendance Report`,
    line: `${r.offering.subject.name} (${r.offering.subject.code}) · ${className(r.offering.class)} · ${r.offering.term_label}`,
    meta: `${range} · ${r.sessions.length} classes · Teacher: ${r.offering.teacher.full_name}`,
  };
}

async function toExcel(r: Report) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${INSTITUTE.shortName} Attendance`;
  const h = heading(r);
  const brand = "FF2E1A8A";

  // Summary sheet
  const ws = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 5 }] });
  ws.columns = [{ width: 6 }, { width: 15 }, { width: 30 }, { width: 26 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 13 }];
  ws.addRow([h.title]).font = { bold: true, size: 14, color: { argb: brand } };
  ws.addRow([h.line]).font = { bold: true };
  ws.addRow([h.meta]).font = { color: { argb: "FF666666" } };
  ws.addRow([]);
  const head = ws.addRow(["#", "Roll No", "Name", "Father Name", "Present", "Absent", "Leave", "Attendance %"]);
  head.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brand } };
  });
  r.students.forEach((s, i) => {
    const row = ws.addRow([i + 1, s.roll_no, s.full_name, s.father_name ?? "", s.present, s.absent, s.excused, s.percentage == null ? "" : Math.round(s.percentage * 10) / 10]);
    if (s.percentage != null && s.percentage < MIN_ATTENDANCE_PCT) row.getCell(8).font = { bold: true, color: { argb: "FFC62828" } };
  });

  // Register sheet
  const rg = wb.addWorksheet("Register", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  rg.addRow(["Roll No", "Name", ...r.sessions.map((s) => s.session_date.slice(8) + "/" + s.session_date.slice(5, 7)), "P", "A", "L", "%"]).font = { bold: true };
  rg.addRow(["", "Topic →", ...r.sessions.map((s) => s.topic ?? ""), "", "", "", ""]).font = { italic: true, size: 8, color: { argb: "FF888888" } };
  rg.getColumn(1).width = 15;
  rg.getColumn(2).width = 28;
  for (let i = 3; i < 3 + r.sessions.length; i++) rg.getColumn(i).width = 6;
  const fills = { P: "FFD7F5E3", A: "FFFDDDDD", L: "FFFFF1C7" } as const;
  for (const s of r.students) {
    const row = rg.addRow([
      s.roll_no,
      s.full_name,
      ...s.marks.map((m) => (m ? LETTER[m] : "")),
      s.present,
      s.absent,
      s.excused,
      s.percentage == null ? "" : Math.round(s.percentage),
    ]);
    s.marks.forEach((m, i) => {
      const cell = row.getCell(3 + i);
      cell.alignment = { horizontal: "center" };
      if (m) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fills[LETTER[m]] } };
    });
  }
  return wb.xlsx.writeBuffer();
}

function toPdf(r: Report) {
  const h = heading(r);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(13);
  doc.setTextColor(46, 26, 138);
  doc.text(h.title, 12, 14);
  doc.setFontSize(9.5);
  doc.setTextColor(30);
  doc.text(h.line, 12, 20);
  doc.setTextColor(110);
  doc.text(h.meta, 12, 25);

  const dates = r.sessions.map((s) => `${s.session_date.slice(8)}/${s.session_date.slice(5, 7)}`);
  autoTable(doc, {
    startY: 30,
    head: [["#", "Roll No", "Name", ...dates, "P", "A", "%"]],
    body: r.students.map((s, i) => [
      i + 1,
      s.roll_no,
      s.full_name,
      ...s.marks.map((m) => (m ? LETTER[m] : "")),
      s.present,
      s.absent,
      s.percentage == null ? "–" : `${Math.round(s.percentage)}%`,
    ]),
    styles: { fontSize: 7, cellPadding: 1, halign: "center" },
    headStyles: { fillColor: [46, 26, 138], fontSize: 7 },
    columnStyles: { 1: { halign: "left", cellWidth: 22 }, 2: { halign: "left", cellWidth: 42 } },
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [1, 2],
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const v = String(d.cell.raw);
      if (v === "A") d.cell.styles.textColor = [198, 40, 40];
      if (v === "L") d.cell.styles.textColor = [180, 120, 0];
      if (d.column.index === 3 + r.sessions.length + 2 && v.endsWith("%") && parseInt(v) < MIN_ATTENDANCE_PCT) {
        d.cell.styles.textColor = [198, 40, 40];
        d.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      doc.setFontSize(7);
      doc.setTextColor(140);
      doc.text(`P = Present · A = Absent · L = Leave · Minimum required ${MIN_ATTENDANCE_PCT}% · Generated ${fmtDate(new Date())}`, 12, 203);
    },
  });
  return doc.output("arraybuffer");
}
