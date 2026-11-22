"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGridIcon, LogInIcon, SearchIcon } from "lucide-react";
import { NavPending } from "@/components/layout/nav-pending";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Departments", icon: LayoutGridIcon, match: (p: string) => p === "/" || p.startsWith("/d/") },
  { href: "/search", label: "Search", icon: SearchIcon, match: (p: string) => p.startsWith("/search") || p.startsWith("/s/") },
  { href: "/login", label: "Teacher", icon: LogInIcon, match: (p: string) => p.startsWith("/login") },
];

export function PublicTabs({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "top") {
    return (
      <nav className="hidden items-center gap-1 md:flex">
        {TABS.map(({ href, label, icon: Icon, match }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
              match(pathname) ? "bg-white/20 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4" />
            {label}
            <NavPending />
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-safe backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 px-2 pt-1.5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href} className="group flex flex-col items-center gap-0.5 py-1 active:scale-95">
              <span
                className={cn(
                  "relative flex h-8 w-14 items-center justify-center rounded-full transition-all",
                  active ? "bg-linear-to-r from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <NavPending className="absolute -top-0.5 -right-0.5" />
              </span>
              <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
