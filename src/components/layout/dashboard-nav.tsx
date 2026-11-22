"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarCheckIcon,
  ContactRoundIcon,
  GlobeIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  ScanLineIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand, BrandMark } from "@/components/brand/brand";
import { signOut } from "@/features/auth/actions";
import { NavPending } from "./nav-pending";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, exact: true, color: "text-indigo-500" },
  { href: "/dashboard/sessions", label: "Attendance", icon: CalendarCheckIcon, color: "text-emerald-500" },
  { href: "/dashboard/students", label: "Students", icon: UsersIcon, color: "text-sky-500" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3Icon, color: "text-amber-500" },
  { href: "/dashboard/id-cards", label: "ID Cards", icon: ContactRoundIcon, color: "text-fuchsia-500" },
  { href: "/dashboard/import", label: "Import", icon: UploadIcon, color: "text-rose-500" },
  { href: "/dashboard/courses", label: "Courses", icon: BookOpenIcon, color: "text-violet-500" },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon, color: "text-slate-500" },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, color, ...rest }) => {
        const active = isActive(href, "exact" in rest);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "pressable flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium",
              active
                ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", !active && color)} />
            <span className="flex-1">{label}</span>
            <NavPending />
          </Link>
        );
      })}
      <Link
        href="/"
        onClick={onNavigate}
        className="pressable mt-2 flex h-10 items-center gap-3 rounded-xl border border-dashed px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <GlobeIcon className="size-[18px] text-teal-500" />
        <span className="flex-1">Student portal</span>
        <NavPending />
      </Link>
    </nav>
  );
}

function UserBlock({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-pink-500 text-sm font-bold text-white">
        {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">Teacher · Admin</div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-destructive"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOutIcon className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function DashboardSidebar({ name }: { name: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar/80 px-3 py-4 backdrop-blur-xl lg:flex">
      <Brand className="px-2" />
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <UserBlock name={name} />
    </aside>
  );
}

const MOBILE_TABS = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, exact: true },
  { href: "/dashboard/students", label: "Students", icon: UsersIcon },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3Icon },
] as const;

export function DashboardMobileNav({ name }: { name: string }) {
  const isActive = useIsActive();
  const [menuOpen, setMenuOpen] = useState(false);
  const tab = (t: (typeof MOBILE_TABS)[number]) => {
    const active = isActive(t.href, "exact" in t);
    const Icon = t.icon;
    return (
      <Link key={t.href} href={t.href} className="flex flex-col items-center gap-0.5 py-1 active:scale-95">
        <span className={cn("relative flex h-8 w-12 items-center justify-center rounded-full transition-all", active ? "bg-indigo-100 text-indigo-700" : "text-muted-foreground")}>
          <Icon className="size-5" />
          <NavPending className="absolute -top-0.5 -right-0.5 text-indigo-600" />
        </span>
        <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-linear-to-r from-indigo-700 via-violet-700 to-fuchsia-700 pt-[env(safe-area-inset-top)] text-white shadow-lg shadow-indigo-900/10 lg:hidden">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <BrandMark size={32} className="rounded-xl ring-2 ring-white/30" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[15px] font-semibold">IHS Attendance</div>
            <div className="truncate text-[11px] text-white/70">Teacher</div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-safe backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 items-end px-1 pt-1.5">
          {tab(MOBILE_TABS[0])}
          {tab(MOBILE_TABS[1])}
          {/* Centre action: start / resume a class */}
          <Link href="/dashboard/sessions" className="flex flex-col items-center gap-0.5 active:scale-95" aria-label="Take attendance">
            <span className="relative -mt-6 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg ring-4 shadow-emerald-500/30 ring-background">
              <ScanLineIcon className="size-6" />
              <NavPending className="absolute top-1 right-1" />
            </span>
            <span className={cn("text-[11px] font-semibold", isActive("/dashboard/sessions") ? "text-emerald-600" : "text-muted-foreground")}>Attendance</span>
          </Link>
          {tab(MOBILE_TABS[2])}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="flex h-8 w-12 items-center justify-center rounded-full">
                <MenuIcon className="size-5" />
              </span>
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-3xl px-4 pb-safe">
              <SheetHeader className="px-0">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto">
                <NavLinks onNavigate={() => setMenuOpen(false)} />
              </div>
              <div className="mt-3">
                <UserBlock name={name} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
