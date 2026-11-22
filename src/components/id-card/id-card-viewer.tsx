"use client";
import { useRef, useState } from "react";
import { DownloadIcon, FileDownIcon, Loader2Icon, RotateCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CARD_H, CARD_W, IdCardBack, IdCardFront, type CardStudent } from "./id-card";
import { downloadDataUrl, nodeToPng, singleCardPdf } from "./export";

/** One student's card with a flip preview and PNG/PDF downloads. */
export function IdCardViewer({ student, scale = 1, className }: { student: CardStudent; scale?: number; className?: string }) {
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [busy, setBusy] = useState(false);
  const base = student.roll_no;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      toast.error("Could not create the file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => setSide((s) => (s === "front" ? "back" : "front"))}
        className="group relative [perspective:1200px]"
        style={{ width: CARD_W * scale, height: CARD_H * scale }}
        aria-label={`Show ${side === "front" ? "back" : "front"} of card`}
      >
        <div
          className="relative size-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: side === "back" ? "rotateY(180deg)" : undefined }}
        >
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <IdCardFront ref={front} s={student} />
            </div>
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <IdCardBack ref={back} s={student} />
            </div>
          </div>
        </div>
        <span className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors group-hover:text-foreground">
          <RotateCwIcon className="size-4" />
        </span>
      </button>
      <p className="text-xs text-muted-foreground">Tap the card to flip it</p>
      <div className="flex gap-2">
        <Button onClick={() => run(() => singleCardPdf(front.current!, back.current!, `${base}-id-card.pdf`))} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <FileDownIcon />}
          Download PDF
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" disabled={busy} />}>
            <DownloadIcon /> Image
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => run(async () => downloadDataUrl(await nodeToPng(front.current!), `${base}-front.png`))}>
              Front (PNG)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(async () => downloadDataUrl(await nodeToPng(back.current!), `${base}-back.png`))}>
              Back (PNG)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
