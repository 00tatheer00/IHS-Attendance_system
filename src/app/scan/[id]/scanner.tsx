"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CameraIcon,
  CheckCircle2Icon,
  CheckCheckIcon,
  CloudOffIcon,
  CloudUploadIcon,
  KeyboardIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  SwitchCameraIcon,
  XIcon,
  AlertCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/students/student-avatar";
import { createClient } from "@/lib/supabase/client";
import { createQrDetector, type Detector } from "@/features/scanner/qr-detector";
import { feedback, unlockAudio, type FeedbackKind } from "@/features/scanner/feedback";
import { offlineQueue, type QueuedMark } from "@/features/scanner/offline-queue";
import { closeSession } from "@/features/sessions/actions";
import { QR_PREFIX } from "@/config/institute";
import type { Gender, SessionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useOnline } from "@/lib/use-browser";

interface Student {
  id: string;
  roll_no: string;
  full_name: string;
  gender: Gender | null;
  qr_token: string;
  photoUrl: string | null;
  present: boolean;
}

interface Flash {
  kind: FeedbackKind;
  title: string;
  student?: Student;
  key: number;
}

const SAME_CARD_COOLDOWN = 2500; // ms — ignore the same card while it's still in front of the camera
const SCAN_INTERVAL = 80;

/** Errors from supabase-js that mean "could not reach the server" (vs. a real rejection). */
const isNetworkError = (e: { message?: string } | null) =>
  !navigator.onLine || /fetch|network|load failed|timeout/i.test(e?.message ?? "");

export function Scanner({
  sessionId,
  status,
  title,
  subtitle,
  roster,
}: {
  sessionId: string;
  status: SessionStatus;
  title: string;
  subtitle: string;
  roster: Student[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const recent = useRef(new Map<string, number>());
  const flushing = useRef(false);

  const byToken = useMemo(() => new Map(roster.map((s) => [s.qr_token, s])), [roster]);
  const [present, setPresent] = useState<Set<string>>(() => new Set(roster.filter((s) => s.present).map((s) => s.id)));
  const [log, setLog] = useState<{ student: Student; at: Date }[]>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "denied">("idle");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [pending, setPending] = useState(0);
  const online = useOnline();
  const [manualOpen, setManualOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const show = useCallback((f: Omit<Flash, "key">) => {
    feedback(f.kind);
    setFlash({ ...f, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), flash.kind === "ok" ? 1400 : 1800);
    return () => clearTimeout(t);
  }, [flash]);

  // ---------- server sync -------------------------------------------
  const refreshPending = useCallback(async () => {
    try {
      setPending((await offlineQueue.all()).filter((m) => m.session === sessionId).length);
    } catch {}
  }, [sessionId]);

  const send = useCallback(
    async (m: QueuedMark): Promise<"ok" | "network" | { reject: string }> => {
      const { data, error } =
        m.kind === "qr"
          ? await supabase.rpc("mark_attendance", { p_session: m.session, p_token: m.token, p_marked_at: m.at })
          : await supabase.rpc("set_attendance_status", { p_session: m.session, p_student: m.student, p_status: "present", p_note: null });
      if (error) return isNetworkError(error) ? "network" : { reject: error.message };
      const result = (data as { result?: string } | null)?.result;
      if (m.kind === "qr" && result && !["marked", "already"].includes(result)) return { reject: result };
      return "ok";
    },
    [supabase],
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const m of await offlineQueue.all()) {
        const r = await send(m);
        if (r === "network") break;
        await offlineQueue.remove(m.id!);
        if (r !== "ok") toast.error(`A saved scan was rejected (${r.reject}).`);
      }
    } finally {
      flushing.current = false;
      void refreshPending();
    }
  }, [send, refreshPending]);

  useEffect(() => {
    void flush(); // also refreshes the pending count
    const on = () => void flush();
    window.addEventListener("online", on);
    const t = setInterval(() => void flush(), 15000);
    return () => {
      window.removeEventListener("online", on);
      clearInterval(t);
    };
  }, [flush]);

  /** Mark present: instant local feedback, server write in the background. */
  const markPresent = useCallback(
    async (student: Student, mark: QueuedMark) => {
      setPresent((p) => new Set(p).add(student.id));
      setLog((l) => [{ student, at: new Date() }, ...l].slice(0, 30));
      const r = await send(mark);
      if (r === "network") {
        await offlineQueue.add(mark);
        void refreshPending();
      } else if (r !== "ok") {
        setPresent((p) => { const n = new Set(p); n.delete(student.id); return n; });
        setLog((l) => l.filter((x) => x.student.id !== student.id));
        const msg = r.reject === "session_closed" ? "This class is closed. Reopen it to keep scanning." : `Not saved: ${r.reject}`;
        show({ kind: "error", title: msg, student });
      }
    },
    [send, refreshPending, show],
  );

  // ---------- scanning ----------------------------------------------
  const onCode = useCallback(
    (raw: string) => {
      const now = Date.now();
      const last = recent.current.get(raw);
      recent.current.set(raw, now);
      if (last && now - last < SAME_CARD_COOLDOWN) return;

      if (!raw.startsWith(QR_PREFIX)) return show({ kind: "error", title: "Not an IHS student card" });
      const token = raw.slice(QR_PREFIX.length);
      const student = byToken.get(token);
      if (!student) return show({ kind: "error", title: "Card not in this class (or replaced)" });
      if (present.has(student.id)) return show({ kind: "already", title: "Already marked", student });

      show({ kind: "ok", title: "Present", student });
      void markPresent(student, { kind: "qr", session: sessionId, token, at: new Date().toISOString() });
    },
    [byToken, present, show, markPresent, sessionId],
  );

  const onCodeRef = useRef(onCode);
  useEffect(() => { onCodeRef.current = onCode; }, [onCode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      unlockAudio();
      setPhase("starting");
      stopCamera();
      try {
        detectorRef.current ??= await createQrDetector();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setPhase("running");
      } catch (e) {
        console.error(e);
        setPhase("denied");
      }
    },
    [stopCamera],
  );

  // Detection loop
  useEffect(() => {
    if (phase !== "running") return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const v = videoRef.current;
      if (!alive || !v || !detectorRef.current) return;
      if (v.readyState >= 2) {
        try {
          for (const c of await detectorRef.current.detect(v)) if (c.rawValue) onCodeRef.current(c.rawValue);
        } catch {}
      }
      if (alive) timer = setTimeout(tick, SCAN_INTERVAL);
    };
    void tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [phase]);

  // Keep the screen awake while scanning; stop the camera on leave.
  useEffect(() => {
    if (phase !== "running") return;
    let lock: { release(): Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request(t: "screen"): Promise<typeof lock> } }).wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [phase]);
  useEffect(() => stopCamera, [stopCamera]);

  // ---------- finish ------------------------------------------------
  async function finish() {
    setFinishing(true);
    await flush();
    const left = (await offlineQueue.all()).filter((m) => m.session === sessionId).length;
    if (left) {
      toast.error(`${left} scan(s) are still waiting for internet. Connect, then finish.`);
      setFinishing(false);
      return;
    }
    const r = await closeSession(sessionId);
    if (r.error) {
      toast.error(r.error);
      setFinishing(false);
      return;
    }
    stopCamera();
    toast.success(`Class finished. ${r.absent ?? 0} marked absent.`);
    router.push(`/dashboard/sessions/${sessionId}`);
  }

  const total = roster.length;
  const count = present.size;
  const closed = status !== "open";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-black text-white select-none">
      {/* camera */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={cn("absolute inset-0 size-full object-cover", facing === "user" && "-scale-x-100")}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      {/* top bar */}
      <header className="relative z-10 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <Link
          href={`/dashboard/sessions/${sessionId}`}
          onClick={stopCamera}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
          aria-label="Close scanner"
        >
          <XIcon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title}</div>
          <div className="text-xs text-white/70">{subtitle}</div>
        </div>
        {(!online || pending > 0) && (
          <div className="flex items-center gap-1.5 rounded-full bg-warning/90 px-2.5 py-1 text-xs font-medium text-warning-foreground">
            {online ? <CloudUploadIcon className="size-3.5" /> : <CloudOffIcon className="size-3.5" />}
            {pending > 0 ? `${pending} to sync` : "Offline"}
          </div>
        )}
        <div className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
          <span className="tabular text-lg font-semibold">{count}</span>
          <span className="tabular text-sm text-white/60">/{total}</span>
        </div>
      </header>

      {/* progress */}
      <div className="relative z-10 mx-4 h-1 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${total ? (100 * count) / total : 0}%` }} />
      </div>

      {/* viewfinder */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        {phase === "running" && (
          <div
            className={cn(
              "relative aspect-square w-[min(72vw,340px)] rounded-3xl transition-shadow duration-200",
              flash?.kind === "ok" && "shadow-[0_0_0_4px_var(--success),0_0_60px_10px_color-mix(in_oklch,var(--success)_50%,transparent)]",
              flash?.kind === "already" && "shadow-[0_0_0_4px_var(--warning)]",
              flash?.kind === "error" && "shadow-[0_0_0_4px_var(--destructive)]",
            )}
          >
            {(["top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-r-4 border-b-4 rounded-br-3xl"] as const).map((c) => (
              <span key={c} className={cn("absolute size-12 border-white", c)} />
            ))}
            {!flash && <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse rounded-full bg-white/70" />}
          </div>
        )}

        {phase !== "running" && (
          <div className="mx-6 max-w-sm text-center">
            {closed ? (
              <>
                <AlertCircleIcon className="mx-auto size-10 text-warning" />
                <p className="mt-3 font-medium">This class is {status}.</p>
                <p className="mt-1 text-sm text-white/70">Reopen it from the class page to scan again.</p>
              </>
            ) : phase === "denied" ? (
              <>
                <CameraIcon className="mx-auto size-10 text-white/70" />
                <p className="mt-3 font-medium">Camera not available</p>
                <p className="mt-1 text-sm text-white/70">
                  Allow camera access in your browser settings, then try again. You can still mark students by name.
                </p>
                <Button className="mt-4" variant="secondary" onClick={() => startCamera(facing)}>
                  <RefreshCwIcon /> Try again
                </Button>
              </>
            ) : (
              <button
                onClick={() => startCamera(facing)}
                disabled={phase === "starting"}
                className="flex flex-col items-center gap-4 rounded-3xl bg-white/10 px-10 py-8 backdrop-blur transition hover:bg-white/15"
              >
                <span className="flex size-20 items-center justify-center rounded-full bg-white text-brand">
                  {phase === "starting" ? <Loader2Icon className="size-9 animate-spin" /> : <CameraIcon className="size-9" />}
                </span>
                <span className="text-lg font-semibold">Tap to start scanning</span>
                <span className="text-sm text-white/70">Students hold their ID card’s QR code up to the camera</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* result card */}
      {flash && (
        <div key={flash.key} className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={cn(
              "flex w-full max-w-sm items-center gap-3 rounded-2xl p-3 pr-4 shadow-2xl",
              flash.kind === "ok" ? "bg-success text-success-foreground" : flash.kind === "already" ? "bg-warning text-warning-foreground" : "bg-destructive text-white",
            )}
          >
            {flash.student ? (
              <StudentAvatar photoUrl={flash.student.photoUrl} gender={flash.student.gender} name={flash.student.full_name} className="size-16 rounded-xl border-2 border-white/60" />
            ) : (
              <AlertCircleIcon className="m-2 size-8" />
            )}
            <div className="min-w-0 flex-1">
              {flash.student && <div className="truncate text-lg leading-tight font-semibold">{flash.student.full_name}</div>}
              {flash.student && <div className="font-mono text-sm opacity-80">{flash.student.roll_no}</div>}
              <div className={cn("flex items-center gap-1 font-medium", flash.student ? "text-sm" : "text-base")}>
                {flash.kind === "ok" && <CheckCircle2Icon className="size-4" />}
                {flash.title}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* bottom */}
      <footer className="relative z-10 space-y-3 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {log.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {log.slice(0, 12).map(({ student, at }) => (
              <div key={student.id + at.getTime()} className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm backdrop-blur">
                <StudentAvatar photoUrl={student.photoUrl} gender={student.gender} name={student.full_name} className="size-7" />
                <span className="max-w-32 truncate">{student.full_name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <BarButton onClick={() => setManualOpen(true)} icon={<KeyboardIcon />} label="By name" disabled={closed} />
          <BarButton
            onClick={() => {
              const next = facing === "environment" ? "user" : "environment";
              setFacing(next);
              if (phase === "running") void startCamera(next);
            }}
            icon={<SwitchCameraIcon />}
            label="Flip camera"
          />
          <BarButton onClick={() => setConfirmFinish(true)} icon={<CheckCheckIcon />} label="Finish" primary disabled={closed} />
        </div>
      </footer>

      {/* finish confirm */}
      <Sheet open={confirmFinish} onOpenChange={setConfirmFinish}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader>
            <SheetTitle>Finish this class?</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <p className="text-sm text-muted-foreground">
              <b className="text-foreground">{count}</b> present. {total - count > 0 ? <><b className="text-foreground">{total - count}</b> not scanned will be marked absent.</> : "Everyone is here!"} You can still correct anyone later.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={() => setConfirmFinish(false)}>
                Keep scanning
              </Button>
              <Button className="h-11" onClick={finish} disabled={finishing}>
                {finishing && <Loader2Icon className="animate-spin" />}
                Finish class
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ManualMark
        open={manualOpen}
        onOpenChange={setManualOpen}
        roster={roster}
        present={present}
        onMark={(s) => {
          show({ kind: "ok", title: "Present (marked by name)", student: s });
          void markPresent(s, { kind: "manual", session: sessionId, student: s.id, at: new Date().toISOString() });
        }}
      />
    </div>
  );
}

function BarButton({ onClick, icon, label, primary, disabled }: { onClick: () => void; icon: React.ReactNode; label: string; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium backdrop-blur transition disabled:opacity-40 [&_svg]:size-5",
        primary ? "bg-white text-brand hover:bg-white/90" : "bg-white/12 hover:bg-white/20",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ManualMark({
  open,
  onOpenChange,
  roster,
  present,
  onMark,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roster: Student[];
  present: Set<string>;
  onMark: (s: Student) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return roster
      .filter((r) => !s || r.full_name.toLowerCase().includes(s) || r.roll_no.toLowerCase().includes(s))
      .sort((a, b) => Number(present.has(a.id)) - Number(present.has(b.id)));
  }, [q, roster, present]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80dvh] rounded-t-2xl pb-safe">
        <SheetHeader>
          <SheetTitle>Mark by name</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or roll number" className="h-11 pl-9" />
          </div>
        </div>
        <ul className="flex-1 divide-y overflow-auto px-2">
          {list.map((s) => {
            const done = present.has(s.id);
            return (
              <li key={s.id}>
                <button
                  disabled={done}
                  onClick={() => { onMark(s); setQ(""); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted disabled:opacity-60"
                >
                  <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} name={s.full_name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.full_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{s.roll_no}</div>
                  </div>
                  {done ? <CheckCircle2Icon className="size-5 text-success" /> : <span className="text-sm font-medium text-brand">Mark</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
