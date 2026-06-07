/**
 * MinerU 识别服务（前端层）
 * 通过 /api/recognize API Route 调用后端，密钥不暴露
 * 带 IndexedDB 缓存，相同文件（SHA-256 hash）免解析
 */

import { computeFileHash, getCachedResult, setCachedResult } from "./cacheDb";

export interface ExtractedInvoice {
  type: string;
  number: string;
  date: string;
  seller: string;
  buyer: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate: number;
    taxAmount: number;
  }>;
}

export interface ParsedInvoice extends ExtractedInvoice {}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

/**
 * 完整的识别流程：缓存检查 → /api/recognize → 返回结构化数据
 * 带 IndexedDB 缓存，相同文件（SHA-256 hash）直接返回缓存结果
 */
export async function recognizeInvoice(
  file: File,
  onProgress?: (msg: string, percent?: number) => void
): Promise<{ parsed: ParsedInvoice; markdown: string }> {
  // 1. 计算文件 hash
  onProgress?.("计算文件特征...", 2);
  const hash = await computeFileHash(file);

  // 2. 检查 IndexedDB 缓存
  onProgress?.("检查本地缓存...", 5);
  const cached = await getCachedResult(hash);
  if (cached) {
    onProgress?.("命中本地缓存，直接返回结果", 100);
    return {
      parsed: cached.parsed as ParsedInvoice,
      markdown: cached.markdown,
    };
  }

  // 3. 调用后端 API Route
  onProgress?.("正在识别中，请稍候...", 10);
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/recognize", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "请求失败" }));
    throw new Error(err.error || `识别失败: ${res.status}`);
  }

  const { markdown, parsed } = await res.json() as {
    markdown: string;
    parsed: ExtractedInvoice;
  };

  onProgress?.("识别完成", 100);

  // 4. 存入 IndexedDB 缓存
  await setCachedResult({
    hash,
    parsed: parsed as unknown,
    markdown,
    fileName: file.name,
    createdAt: Date.now(),
  });

  return { parsed, markdown };
}
