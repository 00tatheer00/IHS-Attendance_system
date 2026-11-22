import { Bone, HeaderSkeleton, ListSkeleton, StatsSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton actions={false} />
      <Bone className="mb-6 h-36 rounded-3xl" />
      <StatsSkeleton />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ListSkeleton rows={5} />
        <ListSkeleton rows={5} />
      </div>
    </div>
  );
}
