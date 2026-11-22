"use client";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/** Tiny spinner shown inside a <Link> while its page is loading. Must be rendered inside the Link. */
export function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span aria-hidden className={cn("inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80", className)} />
  );
}
