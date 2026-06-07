/**
 * IndexedDB 缓存层：缓存 MinerU 发票识别结果，按文件 SHA-256 hash 去重
 */

const DB_NAME = "mineru-cache";
const STORE_NAME = "invoice-recognitions";
const DB_VERSION = 1;

interface CacheEntry {
  hash: string;
  parsed: unknown;
  markdown: string;
  fileName: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "hash" });
      }
    };
  });
}

export async function getCachedResult(hash: string): Promise<CacheEntry | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(hash);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const result = req.result as CacheEntry | undefined;
      resolve(result ?? null);
    };
  });
}

export async function setCachedResult(entry: CacheEntry): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
