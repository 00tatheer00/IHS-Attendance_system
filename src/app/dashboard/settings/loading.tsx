import { Bone, HeaderSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton actions={false} />
      <Bone className="h-72 rounded-2xl" />
    </div>
  );
}
