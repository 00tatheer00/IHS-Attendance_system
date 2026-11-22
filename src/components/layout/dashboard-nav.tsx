"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarCheckIcon,
  ContactRoundIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "@/components/brand/brand";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, exact: true },
  { href: "/dashboard/sessions", label: "Attendance", icon: CalendarCheckIcon },
  { href: "/dashboard/students", label: "Students", icon: UsersIcon },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3Icon },
  { href: "/dashboard/id-cards", label: "ID Cards", icon: ContactRoundIcon },
  { href: "/dashboard/import", label: "Import", icon: UploadIcon },
  { href: "/dashboard/courses", label: "Courses", icon: BookOpenIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
] as const;

const MOBILE_PRIMARY = NAV.slice(0, 4);

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, ...rest }) => {
        const active = isActive(href, "exact" in rest);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">Teacher</div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-4 lg:flex">
      <Brand className="px-2" />
      <div className="flex-1">
        <NavLinks />
      </div>
      <UserBlock name={name} />
    </aside>
  );
}

export function DashboardMobileNav({ name }: { name: string }) {
  const isActive = useIsActive();
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
        <Brand />
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-safe pt-1.5 backdrop-blur lg:hidden">
        {MOBILE_PRIMARY.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(href, "exact" in rest);
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium", active ? "text-brand" : "text-muted-foreground")}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted-foreground">
            <MenuIcon className="size-5" />
            More
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-safe">
            <SheetHeader className="px-0">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <NavLinks />
            <div className="mt-3">
              <UserBlock name={name} />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
