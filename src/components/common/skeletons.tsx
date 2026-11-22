import { cn } from "@/lib/utils";

/** Shimmering placeholder block. */
export function Bone({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg bg-muted", className)} />;
}

export function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      {actions && (
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}

export function CardGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4">
          <Bone className="mb-4 size-11 rounded-xl" />
          <Bone className="h-4 w-3/4" />
          <Bone className="mt-2 h-3 w-1/2" />
          <Bone className="mt-4 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y overflow-hidden rounded-2xl border bg-card", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Bone className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4">
          <Bone className="h-3 w-20" />
          <Bone className="mt-3 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

export function StudentPageSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex flex-col items-center rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6">
        <div className="size-16 animate-pulse rounded-2xl bg-white/25" />
        <div className="mt-3 h-5 w-40 animate-pulse rounded bg-white/25" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded bg-white/20" />
        <div className="mt-6 size-40 animate-pulse rounded-full border-[14px] border-white/20" />
      </div>
      <StatsSkeleton count={3} />
      <ListSkeleton rows={5} />
    </div>
  );
}
