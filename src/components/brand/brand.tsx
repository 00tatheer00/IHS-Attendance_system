import Image from "next/image";
import { INSTITUTE } from "@/config/institute";
import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <Image
      src={INSTITUTE.logo}
      alt={`${INSTITUTE.shortName} crest`}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md bg-white object-contain", className)}
      priority
    />
  );
}

export function Brand({ subtitle = "Attendance", className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="leading-tight">
        <div className="text-sm font-semibold">{INSTITUTE.shortName} {subtitle}</div>
        <div className="text-[11px] text-muted-foreground">{INSTITUTE.affiliation}</div>
      </div>
    </div>
  );
}
