import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { searchStudents } from "@/lib/public";
import { SearchBox } from "../search-box";
import { StudentResults } from "../student-results";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const results = q.length >= 2 ? await searchStudents(q) : null;

  return (
    <div className="space-y-4">
      <h1 className="px-1 text-2xl font-bold tracking-tight">Search</h1>
      <SearchBox defaultValue={q} basePath="/search" autoFocus placeholder="Name or roll number" />
      {results ? (
        <StudentResults results={results} query={q} />
      ) : (
        <div className="flex flex-col items-center px-6 py-14 text-center text-muted-foreground">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20">
            <SearchIcon className="size-6" />
          </div>
          <p className="font-medium text-foreground">Find any student</p>
          <p className="mt-1 text-sm">Type at least 2 letters of a name, or a roll number like CAR-F26-01.</p>
        </div>
      )}
    </div>
  );
}
