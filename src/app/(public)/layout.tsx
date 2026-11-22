import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/brand";
import { INSTITUTE } from "@/config/institute";
import { PublicTabs } from "./public-tabs";

/**
 * Public student portal shell — app-style: coloured app bar on top, tab bar at
 * the bottom on phones. No session/cookie work here, so pages are served from
 * cache and feel instant.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/setup");
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-linear-to-r from-indigo-700 via-violet-700 to-fuchsia-700 pt-[env(safe-area-inset-top)] text-white shadow-lg shadow-indigo-900/10">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={34} className="rounded-xl ring-2 ring-white/30" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15px] font-semibold">{INSTITUTE.shortName} Attendance</div>
              <div className="truncate text-[11px] text-white/70">{INSTITUTE.name}</div>
            </div>
          </Link>
          <PublicTabs variant="top" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-5 pb-28 md:pb-16">{children}</main>
      <PublicTabs variant="bottom" />
    </div>
  );
}
