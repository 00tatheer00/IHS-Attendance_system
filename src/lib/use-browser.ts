"use client";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Reads a browser-only value without hydration mismatches (server snapshot = fallback). */
export function useBrowserValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => fallback);
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
