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
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={34} className="rounded-xl shadow-sm ring-1 ring-border" />
            <div className="min-w-0 leading-tight">
              <div className="text-gradient-brand truncate text-[15px] font-bold">{INSTITUTE.shortName} Attendance</div>
              <div className="truncate text-[11px] text-muted-foreground">{INSTITUTE.name}</div>
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
