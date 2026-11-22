"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";

/**
 * Search-as-you-type. With `basePath` it updates ?q= in the URL (server search);
 * with `onChange` it just reports the text (instant client-side filtering).
 */
export function SearchBox({
  defaultValue = "",
  basePath,
  onChange,
  placeholder = "Your name or roll number",
  autoFocus,
}: {
  defaultValue?: string;
  basePath?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (!basePath) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (value.trim()) p.set("q", value.trim());
      start(() => router.replace(`${basePath}${p.size ? `?${p}` : ""}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
  }, [value, basePath, router]);

  const update = (v: string) => {
    setValue(v);
    onChange?.(v);
  };

  return (
    <div className="relative">
      <SearchIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-indigo-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="search"
        autoFocus={autoFocus}
        className="surface h-14 w-full rounded-2xl pr-12 pl-12 text-base outline-none transition-all duration-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        {pending ? (
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        ) : value ? (
          <button onClick={() => update("")} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Clear">
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
