import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
      <Loader2Icon className="size-8 animate-spin" />
      <p className="text-sm text-white/70">Loading class list…</p>
    </div>
  );
}
