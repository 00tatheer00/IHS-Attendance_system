"use client";
/**
 * Tiny IndexedDB queue for attendance marks made while offline.
 * Each entry is replayed against the server when the connection returns.
 */
export type QueuedMark =
  | { id?: number; kind: "qr"; session: string; token: string; at: string }
  | { id?: number; kind: "manual"; session: string; student: string; at: string };

const DB = "ihs-attendance";
const STORE = "pending-marks";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const offlineQueue = {
  add: (m: QueuedMark) => tx("readwrite", (s) => s.add(m)),
  all: () => tx<QueuedMark[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedMark[]>),
  remove: (id: number) => tx("readwrite", (s) => s.delete(id)),
};
