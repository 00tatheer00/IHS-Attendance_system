import { CardGridSkeleton, HeaderSkeleton } from "@/components/common/skeletons";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <CardGridSkeleton count={8} />
    </div>
  );
}
