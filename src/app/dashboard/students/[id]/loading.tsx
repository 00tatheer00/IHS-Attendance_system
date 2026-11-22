import { Bone, ListSkeleton, StatsSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Bone className="size-16 rounded-2xl" />
          <div className="space-y-2">
            <Bone className="h-6 w-56" />
            <Bone className="h-4 w-40" />
          </div>
        </div>
        <StatsSkeleton />
        <ListSkeleton rows={6} />
      </div>
      <Bone className="h-96 rounded-2xl" />
    </div>
  );
}
