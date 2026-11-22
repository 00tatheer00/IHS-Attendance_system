import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboardIcon, LogInIcon } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { BrandMark } from "@/components/brand/brand";
import { LinkButton } from "@/components/common/link-button";
import { INSTITUTE } from "@/config/institute";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/setup");
  const viewer = await getViewer();
  const staff = viewer && viewer.profile.role !== "student";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={32} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{INSTITUTE.shortName} Attendance</div>
              <div className="truncate text-[11px] text-muted-foreground">{INSTITUTE.name}</div>
            </div>
          </Link>
          {staff ? (
            <LinkButton href="/dashboard" variant="outline" size="sm">
              <LayoutDashboardIcon /> Dashboard
            </LinkButton>
          ) : (
            <LinkButton href="/login" variant="ghost" size="sm">
              <LogInIcon /> Teacher login
            </LinkButton>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16">{children}</main>
    </div>
  );
}
