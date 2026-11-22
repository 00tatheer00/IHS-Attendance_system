"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps a public attendance page fresh: every 30 s while visible, and on return to the tab. */
export function AutoRefresh({ every = 30_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const t = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}
