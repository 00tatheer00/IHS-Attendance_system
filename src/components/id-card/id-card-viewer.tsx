"use client";
import { useEffect, useRef, useState } from "react";
import { DownloadIcon, FileDownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buildCardPdf, CARD, type CardStudent } from "./card-pdf";
import { cardFileName, downloadBlob, loadCardAssets, renderPdfPage } from "./card-client";

/**
 * Shows a student's ID card (front + back) exactly as it prints — the preview
 * is rendered from the real PDF — with PDF and PNG downloads.
 */
export function IdCardViewer({ student, className }: { student: CardStudent; className?: string }) {
  const front = useRef<HTMLCanvasElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<ArrayBuffer | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const doc = buildCardPdf(student, await loadCardAssets([student]));
        const bytes = doc.output("arraybuffer");
        if (!alive) return;
        pdfRef.current = bytes;
        const scale = (window.devicePixelRatio || 1) * 2.2;
        await renderPdfPage(bytes, 1, front.current!, scale);
        await renderPdfPage(bytes, 2, back.current!, scale);
        if (alive) setReady(true);
      } catch (e) {
        console.error(e);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [student]);

  async function downloadPdf() {
    if (!pdfRef.current) return;
    downloadBlob(new Blob([pdfRef.current], { type: "application/pdf" }), `${cardFileName(student)}.pdf`);
    toast.success("ID card downloaded", { description: "Page 1 is the front, page 2 the back." });
  }

  async function downloadPng(page: 1 | 2) {
    if (!pdfRef.current) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      await renderPdfPage(pdfRef.current, page, canvas, 600 / 72); // 600 dpi
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      downloadBlob(blob, `${cardFileName(student)}-${page === 1 ? "front" : "back"}.png`);
      toast.success(`${page === 1 ? "Front" : "Back"} image downloaded`);
    } catch {
      toast.error("Could not create the image.");
    } finally {
      setBusy(false);
    }
  }

  const ratio = `${CARD.w} / ${CARD.h}`;
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {[
          [front, "Front"],
          [back, "Back"],
        ].map(([ref, label]) => (
          <figure key={label as string} className="space-y-1.5">
            <div className="relative overflow-hidden rounded-xl bg-muted shadow-[0_8px_30px_-12px_rgba(30,20,90,.35)] ring-1 ring-black/5" style={{ aspectRatio: ratio }}>
              <canvas ref={ref as React.RefObject<HTMLCanvasElement>} className={cn("size-full transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")} />
              {!ready && !failed && <Loader2Icon className="absolute inset-0 m-auto size-6 animate-spin text-muted-foreground" />}
            </div>
            <figcaption className="text-center text-xs text-muted-foreground">{label as string}</figcaption>
          </figure>
        ))}
      </div>
      {failed && <p className="text-sm text-destructive">Could not build the card. Check your connection and reload.</p>}
      <div className="flex gap-2">
        <Button onClick={downloadPdf} disabled={!ready} className="h-10">
          <FileDownIcon /> Download PDF
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="h-10" disabled={!ready || busy} />}>
            {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />} Image
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => downloadPng(1)}>Front (PNG)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadPng(2)}>Back (PNG)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-center text-xs text-muted-foreground">PDF: page 1 front, page 2 back · actual card size 54 × 86 mm</p>
    </div>
  );
}
