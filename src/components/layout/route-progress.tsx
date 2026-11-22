"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin gradient progress bar at the top of the screen during page changes
 * (like native apps / YouTube). Starts on any internal link click, finishes
 * when the new route renders.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeKey = `${pathname}?${search}`;
  const lastKey = useRef(routeKey);

  // Start on internal link clicks
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (timer.current) clearInterval(timer.current);
      setProgress(8);
      timer.current = setInterval(() => setProgress((p) => (p == null ? p : p + (90 - p) * 0.12)), 180);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish when the route actually changes
  useEffect(() => {
    if (routeKey === lastKey.current) return;
    lastKey.current = routeKey;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const done = setTimeout(() => setProgress(100), 0);
    const hide = setTimeout(() => setProgress(null), 350);
    return () => {
      clearTimeout(done);
      clearTimeout(hide);
    };
  }, [routeKey]);

  if (progress == null) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full rounded-r-full bg-linear-to-r from-amber-400 via-fuchsia-500 to-indigo-500 shadow-[0_0_10px_rgba(217,70,239,.6)] transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
