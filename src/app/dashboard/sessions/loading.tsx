import { Bone, HeaderSkeleton, ListSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton actions={false} />
      <Bone className="h-40 rounded-3xl" />
      <ListSkeleton rows={6} className="mt-8" />
    </div>
  );
}
