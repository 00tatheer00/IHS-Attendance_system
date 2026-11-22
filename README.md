# IHS Attendance

QR-based attendance system and student portal for the **Institute of Health Sciences, Peshawar**.
Next.js 16 · Supabase (Postgres, Auth, Storage, Realtime, RLS) · TypeScript · Tailwind CSS v4 · PWA.

## Features

| Area | What it does |
|---|---|
| **Import** | Excel/CSV/PDF class lists → review screen → save. Scanned PDFs are read with in-browser OCR (table grid detection + Tesseract) and auto-corrected; every row is reviewable before saving. Duplicate students across departments are flagged. |
| **ID cards** | CR80 cards (front: photo/avatar, name, roll no, program, batch; back: QR code). Single-card PNG/PDF or A4 print sheets (9 per page, double-sided with mirrored backs, crop marks). |
| **Scanner** | Full-screen camera scanner: instant local feedback (sound, vibration, photo), duplicate protection, works offline (queued and synced later), mark-by-name fallback, keeps screen awake. |
| **Sessions** | Start class → scan → finish (unscanned students become absent). Correct any student (Present / Absent / Leave) afterwards; every change is audited. |
| **Reports** | Weekly / monthly / custom summaries and a colour register; export to Excel (summary + register) or PDF. Students below 75% are flagged. |
| **Student portal** | Installable app; attendance %, “classes needed to reach 75%”, calendar and history, ID card download. Updates live when the teacher scans. |

## Setup

1. **Database** — in Supabase → SQL Editor, run `supabase/migrations/20261122000000_init.sql`
   (or `npx supabase link` then `npx supabase db push`). It creates tables, RLS policies, functions,
   the `student-photos` bucket and seeds the 7 departments, Batch 3 and the ICT subject.
2. **Environment** — copy `.env.example` to `.env.local` and fill in the three keys
   (Supabase → Project Settings → API).
3. **Run** — `npm install` then `npm run dev`, open <http://localhost:3000>. You’ll be sent to **/setup**
   to create your teacher (admin) account. Setup disables itself once an admin exists.
4. **Deploy** — import the repo in Vercel and add the same three environment variables.
   HTTPS is required for the camera, which Vercel provides.

### First-day workflow

1. **Import** → upload the class list PDF/Excel → check the rows flagged “Needs a look” → Import.
2. **Courses** → *Add courses* → ICT → tick your classes (students are enrolled automatically).
3. **ID Cards** → choose class → *Print sheets (PDF)* → print double-sided (flip on long edge).
4. **Students** → *Portal accounts* (needs each student’s CNIC; first password = last 6 digits).
5. **Attendance** → *Start scanning*.

## Configuration

`src/config/institute.ts` — institute name, address/phone on the card back, minimum attendance (75%),
student password rule, QR prefix.

## Project structure

```
src/
  app/            routes: /login /setup /dashboard/* /scan/[id] /portal/* /api/reports/export
  components/     ui (shadcn/Base UI) · common · attendance · id-card · students · pwa · layout
  features/       server actions + logic per domain: auth, import (OCR, normalize), students, sessions, courses, scanner
  lib/            supabase clients, auth guards, queries, report builder, formatting
  config/         institute settings
supabase/migrations/   schema, RLS, RPCs (mark_attendance, close_session, …), views
scripts/          test-db (migration + RLS tests on PGlite), test-ocr (PDF import pipeline), make-icons
public/sw.js      service worker (offline shell, cached assets)
```

## Checks

```bash
npm run typecheck && npm run lint
npm run test:db                          # applies the migration to an in-memory Postgres and tests the flow + RLS
npm run test:ocr -- path/to/list.pdf     # runs the PDF import pipeline in Node and prints what it found
```

## Security notes

- Row Level Security on every table: students can read only their own record and attendance; teachers manage only their own courses; admins manage everything.
- All attendance writes go through `security definer` functions that check permissions; scans are idempotent (`unique(session_id, student_id)`).
- QR codes contain a random token, not the roll number, and can be re-issued if a card is lost.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server actions for creating logins.
