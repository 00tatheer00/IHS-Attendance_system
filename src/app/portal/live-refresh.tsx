"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to this student's attendance rows (RLS ensures only their own
 * arrive) and refreshes the page the moment the teacher scans them.
 */
export function LiveRefresh({ studentId }: { studentId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`attendance:${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `student_id=eq.${studentId}` }, (payload) => {
        const status = (payload.new as { status?: string } | null)?.status;
        if (status === "present") toast.success("You’ve been marked present ✓");
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 400); // coalesce bursts (e.g. class closing)
      })
      .subscribe();
    // Also refresh when the app comes back to the foreground.
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [studentId, router]);
  return null;
}
