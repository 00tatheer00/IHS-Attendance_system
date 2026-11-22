"use client";
import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import { INSTITUTE, QR_PREFIX } from "@/config/institute";
import { avatarFor } from "@/components/students/student-avatar";
import type { Gender } from "@/lib/types";

/**
 * CR80 portrait ID card (54 × 85.6 mm), drawn at 340 × 540 px.
 * Uses fixed pixel sizes and inline colours so the PNG/PDF export matches the
 * on-screen preview exactly.
 */
export const CARD_W = 340;
export const CARD_H = 540;

const INDIGO = "#2E1A8A";
const INDIGO_DARK = "#1F1160";
const INK = "#1B1530";
const MUTED = "#6B6585";

export interface CardStudent {
  id: string;
  roll_no: string;
  full_name: string;
  father_name: string | null;
  gender: Gender | null;
  qr_token: string;
  photoUrl?: string | null;
  department: string;   // "Cardiology"
  batch: string;        // "Batch 3"
  session: string | null; // "2026–2030"
}

const cardBase: React.CSSProperties = {
  width: CARD_W,
  height: CARD_H,
  borderRadius: 18,
  overflow: "hidden",
  position: "relative",
  background: "#fff",
  fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
  color: INK,
  boxShadow: "0 0 0 1px rgba(30,20,80,.10)",
  flexShrink: 0,
};

export const IdCardFront = forwardRef<HTMLDivElement, { s: CardStudent }>(function IdCardFront({ s }, ref) {
  return (
    <div ref={ref} style={cardBase}>
      {/* header band */}
      <div
        style={{
          height: 168,
          background: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_DARK} 100%)`,
          color: "#fff",
          padding: "18px 18px 0",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={INSTITUTE.logo} alt="" width={44} height={44} style={{ background: "#fff", borderRadius: 10, padding: 3, objectFit: "contain" }} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.1 }}>{INSTITUTE.name}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{INSTITUTE.affiliation}</div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 140,
            height: 140,
            borderRadius: 999,
            background: "rgba(255,255,255,.06)",
          }}
        />
        <div style={{ marginTop: 14, fontSize: 10, letterSpacing: 2.5, fontWeight: 600, opacity: 0.75 }}>STUDENT IDENTITY CARD</div>
      </div>

      {/* photo */}
      <div style={{ position: "absolute", top: 112, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.photoUrl || avatarFor(s.gender)}
          alt=""
          crossOrigin="anonymous"
          width={124}
          height={148}
          style={{ width: 124, height: 148, objectFit: "cover", borderRadius: 14, border: "4px solid #fff", background: "#E9E6F7", boxShadow: "0 6px 18px rgba(20,10,60,.18)" }}
        />
      </div>

      {/* identity */}
      <div style={{ position: "absolute", top: 272, left: 20, right: 20, textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.2 }}>{s.full_name}</div>
        <div
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "4px 12px",
            borderRadius: 999,
            background: "#EEEBFA",
            color: INDIGO,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
          }}
        >
          {s.roll_no}
        </div>
      </div>

      <div style={{ position: "absolute", top: 362, left: 24, right: 24, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 7, columnGap: 12, fontSize: 12.5 }}>
        <Field label="Program" value={`BS ${s.department}`} />
        <Field label="Batch" value={s.session ? `${s.batch} · ${s.session}` : s.batch} />
        {s.father_name && <Field label="Father" value={s.father_name} />}
      </div>

      {/* footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 34,
          background: INDIGO,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10.5,
          letterSpacing: 1.5,
          fontWeight: 600,
        }}
      >
        {INSTITUTE.city.toUpperCase()} · {INSTITUTE.shortName}
      </div>
    </div>
  );
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div style={{ color: MUTED, fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </>
  );
}

export function useQrSvg(token: string) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(`${QR_PREFIX}${token}`, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: INK, light: "#0000" } }).then(
      (s) => alive && setSvg(s),
    );
    return () => {
      alive = false;
    };
  }, [token]);
  return svg;
}

export const IdCardBack = forwardRef<HTMLDivElement, { s: CardStudent }>(function IdCardBack({ s }, ref) {
  const svg = useQrSvg(s.qr_token);
  return (
    <div ref={ref} style={{ ...cardBase, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ height: 10, width: "100%", background: INDIGO }} />
      <div style={{ marginTop: 26, fontSize: 11, letterSpacing: 2.5, fontWeight: 600, color: MUTED }}>SCAN FOR ATTENDANCE</div>
      <div
        style={{ marginTop: 16, padding: 16, borderRadius: 18, background: "#fff", boxShadow: "0 0 0 1.5px #E4E0F3" }}
      >
        <div style={{ width: 200, height: 200 }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: 17,
          fontWeight: 700,
          color: INDIGO,
          letterSpacing: 0.5,
        }}
      >
        {s.roll_no}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{s.full_name}</div>

      <div style={{ marginTop: "auto", width: "100%", padding: "0 24px 18px", fontSize: 10, lineHeight: 1.45, color: MUTED, textAlign: "center" }}>
        <div style={{ borderTop: "1px solid #ECE9F6", paddingTop: 12 }}>
          This card is the property of the {INSTITUTE.name}. If found, please return to {INSTITUTE.address}
          {INSTITUTE.phone ? ` · ${INSTITUTE.phone}` : ""}.
        </div>
        {s.session && <div style={{ marginTop: 6, fontWeight: 600, color: INK }}>Valid {s.session}</div>}
      </div>
      <div style={{ height: 10, width: "100%", background: INDIGO }} />
    </div>
  );
});
