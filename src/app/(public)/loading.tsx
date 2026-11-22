import { Bone, CardGridSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Bone className="h-40 rounded-3xl" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
