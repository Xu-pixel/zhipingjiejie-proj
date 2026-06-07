/**
 * IndexedDB 缓存层：
 * - invoice-recognitions: 按文件 SHA-256 hash 去重缓存识别结果
 * - invoices: 持久化用户的票据列表
 */

const DB_NAME = "invoice-recognize-cache";
const STORE_NAME = "invoice-recognitions";
const INVOICE_STORE = "invoices";
const DB_VERSION = 2;

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
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onblocked = () => reject(new Error("IndexedDB is blocked by another tab"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "hash" });
      }
      if (!db.objectStoreNames.contains(INVOICE_STORE)) {
        db.createObjectStore(INVOICE_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function getCachedResult(hash: string): Promise<CacheEntry | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(hash);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
      req.onsuccess = () => {
        const result = req.result as CacheEntry | undefined;
        resolve(result ?? null);
      };
    });
  } catch {
    // IndexedDB 不可用时静默降级
    return null;
  }
}

export async function setCachedResult(entry: CacheEntry): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB put failed"));
    // 必须等事务 complete，否则数据可能还没刷盘
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write transaction failed"));
  });
}

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Invoice persistence ----

export async function getAllInvoices<T>(): Promise<T[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(INVOICE_STORE, "readonly");
      const store = tx.objectStore(INVOICE_STORE);
      const req = store.getAll();
      req.onerror = () => reject(req.error ?? new Error("IndexedDB getAll failed"));
      req.onsuccess = () => resolve((req.result ?? []) as T[]);
    });
  } catch {
    return [];
  }
}

export async function saveInvoiceToDb<T extends { id: string }>(invoice: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVOICE_STORE, "readwrite");
    const store = tx.objectStore(INVOICE_STORE);
    store.put(invoice);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put invoice failed"));
  });
}

export async function deleteInvoiceFromDb(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVOICE_STORE, "readwrite");
    const store = tx.objectStore(INVOICE_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete invoice failed"));
  });
}
