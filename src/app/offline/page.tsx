import { WifiOffIcon } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <WifiOffIcon className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">You are offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Check your internet connection. Pages you opened recently are still available.
      </p>
    </main>
  );
}
