"use client";
import { useEffect } from "react";
import { toast } from "sonner";

/** Toasts when the connection drops or comes back. */
export function NetworkStatus() {
  useEffect(() => {
    const off = () => toast.warning("You’re offline", { id: "net", description: "Recently opened pages still work. Changes will sync when you reconnect.", duration: Infinity });
    const on = () => toast.success("Back online", { id: "net", duration: 2500 });
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);
  return null;
}
