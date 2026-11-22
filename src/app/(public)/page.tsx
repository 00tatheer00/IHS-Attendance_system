import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon, SparklesIcon } from "lucide-react";
import { getPublicDepartmentCards } from "@/lib/public";
import { DepartmentCards } from "@/components/common/department-cards";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const metadata: Metadata = { title: "Check your attendance" };

export default async function PublicHome() {
  const departments = await getPublicDepartmentCards();
  const total = departments.reduce((a, d) => a + d.count, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-600/20">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
            <SparklesIcon className="size-3.5" /> {total} students · live attendance
          </span>
          <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">Check your attendance</h1>
          <p className="mt-1 text-sm text-white/80">Pick your department or search your name — no login needed.</p>
          <Link
            href="/search"
            className="pressable mt-5 flex h-13 items-center gap-3 rounded-2xl bg-white px-4 text-[15px] text-muted-foreground shadow-lg shadow-black/10"
          >
            <SearchIcon className="size-5 text-violet-600" />
            Search name or roll number…
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold">Departments</h2>
        <DepartmentCards items={departments.map((d) => ({ key: d.id, href: `/d/${d.code}`, code: d.code, name: d.name, subtitle: `BS ${d.name}`, count: d.count }))} />
      </section>

      <InstallPrompt />
    </div>
  );
}
