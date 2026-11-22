import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

/**
 * Source design for the link-preview image (WhatsApp, Facebook, X, Telegram…).
 * Served as PNG at /og; `npm run og` saves it as public/og.jpg (small JPEG,
 * which WhatsApp loads reliably) — that JPEG is what the metadata points to.
 */
const size = { width: 1200, height: 630 };

const asset = (p: string) => readFile(join(process.cwd(), "public", p));

export async function GET() {
  const [logo, regular, bold] = await Promise.all([
    asset("ihs-logo.png"),
    asset("pdfjs/standard_fonts/LiberationSans-Regular.ttf"),
    asset("pdfjs/standard_fonts/LiberationSans-Bold.ttf"),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  // Attendance ring (SVG) for the illustration
  const r = 62, c = 2 * Math.PI * r, pct = 0.92;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Liberation Sans",
          color: "white",
          backgroundColor: "#1e1b4b",
          backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(129,140,248,0.55) 0%, rgba(129,140,248,0) 45%), radial-gradient(circle at 0% 100%, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0) 40%), linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        }}
      >
        {/* Left: brand + message */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", padding: 8, background: "white", borderRadius: 24, boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} width={88} height={88} alt="" style={{ borderRadius: 16 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 24, color: "rgba(224,231,255,0.85)" }}>Institute of Health Sciences</div>
              <div style={{ fontSize: 22, color: "rgba(224,231,255,0.6)" }}>University of Peshawar</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>IHS Attendance</div>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, color: "#c7d2fe" }}>System</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 26 }}>
            <div
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 28,
                fontWeight: 700,
                color: "#1e1b4b",
                backgroundImage: "linear-gradient(90deg, #fde68a, #fbbf24)",
                boxShadow: "0 8px 24px rgba(251,191,36,0.35)",
              }}
            >
              by {SITE.author}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 34 }}>
            {["QR attendance", "Live percentage", "ID cards"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 16,
                  fontSize: 22,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right: phone-card illustration */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 330,
              padding: "34px 28px 30px",
              borderRadius: 40,
              background: "white",
              color: "#1b1530",
              boxShadow: "0 30px 70px rgba(10,8,40,0.45)",
              transform: "rotate(-4deg)",
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#6b6585" }}>My attendance</div>
            <div style={{ display: "flex", position: "relative", width: 160, height: 160, marginTop: 18 }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={r} fill="none" stroke="#eef0f7" strokeWidth="16" />
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${c * pct} ${c}`}
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 160,
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  fontWeight: 700,
                }}
              >
                92%
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              {[
                ["23", "Present", "#059669", "#ecfdf5"],
                ["2", "Absent", "#e11d48", "#fff1f2"],
              ].map(([n, l, fg, bg]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 20px", borderRadius: 18, background: bg }}>
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: fg }}>{n}</div>
                  <div style={{ display: "flex", fontSize: 16, color: "#6b6585" }}>{l}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 20,
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 700,
                color: "#047857",
                background: "#d1fae5",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#047857" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Marked present
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Liberation Sans", data: regular, weight: 400, style: "normal" },
        { name: "Liberation Sans", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
