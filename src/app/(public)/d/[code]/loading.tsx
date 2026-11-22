import { Bone, ListSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Bone className="h-32 rounded-3xl" />
      <Bone className="h-14 rounded-2xl" />
      <ListSkeleton rows={10} />
    </div>
  );
}
