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
      <section className="bg-hero relative overflow-hidden rounded-[28px] p-6 text-white shadow-2xl shadow-indigo-950/25">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-size-[22px_22px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-white/15 backdrop-blur">
            <SparklesIcon className="size-3.5 text-amber-300" /> {total} students · live attendance
          </span>
          <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">Check your attendance</h1>
          <p className="mt-1 text-sm text-indigo-100/80">Pick your department or search your name — no login needed.</p>
          <Link
            href="/search"
            className="pressable mt-5 flex h-13 items-center gap-3 rounded-2xl bg-white px-4 text-[15px] text-muted-foreground shadow-xl shadow-indigo-950/30 transition-shadow hover:shadow-indigo-400/30"
          >
            <SearchIcon className="size-5 text-indigo-600" />
            Search name or roll number…
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Departments</h2>
        <DepartmentCards items={departments.map((d) => ({ key: d.id, href: `/d/${d.code}`, code: d.code, name: d.name, subtitle: `BS ${d.name}`, count: d.count }))} />
      </section>

      <InstallPrompt />
    </div>
  );
}
