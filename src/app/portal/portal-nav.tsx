"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDaysIcon, ContactRoundIcon, HomeIcon, KeyRoundIcon, LogOutIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/brand/brand";
import { signOut } from "@/features/auth/actions";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Home", icon: HomeIcon },
  { href: "/portal/history", label: "History", icon: CalendarDaysIcon },
  { href: "/portal/card", label: "ID Card", icon: ContactRoundIcon },
];

export function PortalHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link href="/portal" className="flex items-center gap-2">
          <BrandMark size={30} />
          <span className="text-sm font-semibold">IHS Attendance</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand" aria-label="Account">
            {initials(name)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="truncate text-foreground">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/portal/password" />}>
              <KeyRoundIcon /> Change password
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await caches.delete("pages-v1"); // don't leave cached pages on shared phones
                } catch {}
                await signOut();
              }}
            >
              <LogOutIcon /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-safe pt-1.5 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/portal" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium", active ? "text-brand" : "text-muted-foreground")}>
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
