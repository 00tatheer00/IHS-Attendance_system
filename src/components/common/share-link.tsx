"use client";
import { useState } from "react";
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserValue } from "@/lib/use-browser";

/** Shows the public student-portal link with copy / share buttons. */
export function ShareLink() {
  const url = useBrowserValue(() => window.location.origin, "");
  const [copied, setCopied] = useState(false);
  if (!url) return null;
  return (
    <div className="flex flex-col gap-3 surface rounded-2xl p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Student portal link</div>
        <div className="text-sm text-muted-foreground">Share in your class WhatsApp group. Students search their name — no login.</div>
        <div className="mt-1 truncate font-mono text-xs text-brand">{url}</div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
        </Button>
        {"share" in navigator && (
          <Button variant="outline" onClick={() => navigator.share({ title: "IHS Attendance", text: "Check your attendance and download your ID card:", url }).catch(() => {})}>
            <Share2Icon /> Share
          </Button>
        )}
      </div>
    </div>
  );
}
