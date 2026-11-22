import { HeaderSkeleton, ListSkeleton, StatsSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <StatsSkeleton />
      <ListSkeleton rows={10} />
    </div>
  );
}
