"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "./native-select";

/** Class dropdown that writes ?class=… to the URL (keeps other params). */
export function ClassPicker({
  classes,
  value,
  param = "class",
  allLabel,
  className,
}: {
  classes: { id: string; label: string }[];
  value: string;
  param?: string;
  allLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <NativeSelect
      aria-label="Class"
      value={value}
      className={className ?? "w-full sm:w-72"}
      onChange={(e) => {
        const next = new URLSearchParams(sp);
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        router.push(`${pathname}?${next}`);
      }}
    >
      {allLabel && <option value="">{allLabel}</option>}
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </NativeSelect>
  );
}
