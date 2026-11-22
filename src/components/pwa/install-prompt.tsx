"use client";
import { useEffect, useState } from "react";
import { DownloadIcon, ShareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readLocal, useBrowserValue } from "@/lib/use-browser";

type BIPEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "ihs:install-dismissed";

/** "Install the app" card: native prompt on Android/desktop, instructions on iPhone. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [dismissedNow, setDismissedNow] = useState(false);
  const env = useBrowserValue(
    () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches || !!(navigator as unknown as { standalone?: boolean }).standalone;
      return `${standalone || readLocal(KEY) === "1" ? "skip" : "show"}|${/iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other"}`;
    },
    "skip|other",
  );
  const [eligible, platform] = env.split("|");
  const ios = platform === "ios";

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (eligible !== "show" || dismissedNow || (!ios && !evt)) return null;
  const setHidden = (v: boolean) => setDismissedNow(v);
  const dismiss = () => {
    setDismissedNow(true);
    try { localStorage.setItem(KEY, "1"); } catch {}
  };

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <DownloadIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">Install the app</div>
        <div className="text-muted-foreground">
          {ios ? (
            <>Tap <ShareIcon className="inline size-3.5 -translate-y-px" /> Share, then “Add to Home Screen”.</>
          ) : (
            "Open your attendance in one tap, like any other app."
          )}
        </div>
      </div>
      {evt && (
        <Button
          size="sm"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setHidden(true);
          }}
        >
          Install
        </Button>
      )}
      <button onClick={dismiss} className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss">
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
