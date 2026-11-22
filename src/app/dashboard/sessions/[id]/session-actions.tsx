"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BanIcon, CheckCheckIcon, Loader2Icon, MoreHorizontalIcon, RotateCcwIcon, ScanLineIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LinkButton } from "@/components/common/link-button";
import { cancelSession, closeSession, deleteSession, reopenSession } from "@/features/sessions/actions";
import type { SessionStatus } from "@/lib/types";

export function SessionActions({ sessionId, status, unmarked }: { sessionId: string; status: SessionStatus; unmarked: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string; absent?: number }>, ok: (r: { absent?: number }) => string) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else { toast.success(ok(r)); router.refresh(); }
    });

  return (
    <div className="flex gap-2">
      {status === "open" && (
        <>
          <LinkButton href={`/scan/${sessionId}`} variant="outline">
            <ScanLineIcon /> Scanner
          </LinkButton>
          <AlertDialog>
            <AlertDialogTrigger render={<Button disabled={pending} />}>
              {pending ? <Loader2Icon className="animate-spin" /> : <CheckCheckIcon />} Finish class
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finish this class?</AlertDialogTitle>
                <AlertDialogDescription>
                  {unmarked > 0
                    ? `${unmarked} student${unmarked === 1 ? "" : "s"} not scanned will be marked absent. You can still correct anyone afterwards.`
                    : "Everyone has been marked."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep open</AlertDialogCancel>
                <AlertDialogAction onClick={() => run(() => closeSession(sessionId), (r) => `Class finished. ${r.absent ?? 0} marked absent.`)}>
                  Finish class
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {status !== "open" && (
            <DropdownMenuItem onClick={() => run(() => reopenSession(sessionId), () => "Class reopened for scanning.")}>
              <RotateCcwIcon /> Reopen for scanning
            </DropdownMenuItem>
          )}
          {status !== "cancelled" && (
            <DropdownMenuItem onClick={() => run(() => cancelSession(sessionId), () => "Marked as cancelled. It no longer counts towards attendance.")}>
              <BanIcon /> Mark as cancelled
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              if (confirm("Delete this class and all its attendance records? This cannot be undone.")) run(() => deleteSession(sessionId), () => "Deleted.");
            }}
          >
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
