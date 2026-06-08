/**
 * 演示票据「假装识别」表
 * 上传文件命中（按 SHA-256 文件哈希，或文件名关键字兜底）时，
 * 直接返回预置的识别结果，绕过真实 OCR/大模型，确保演示稳定可复现。
 */
import type { ExtractedInvoice } from "./recognizeApi";

interface DemoEntry {
  label: string;
  hashes: string[];
  nameKeywords: string[];
  parsed: ExtractedInvoice;
}

const demoEntries: DemoEntry[] = [
  {
    label: "发票1（研发·教师操作）",
    hashes: ["31505dc58899c831d30ea94844a63345ab6c13ba47a9df12bdf1bd2d20c3ac18"],
    nameKeywords: ["发票1"],
    parsed: {
      type: "增值税专用发票",
      number: "26352000001238127662",
      date: "2024-05-12",
      seller: "泉州智创技术服务有限公司",
      buyer: "汇成针织有限公司",
      amount: 1000000,
      taxRate: 0.06,
      taxAmount: 60000,
      totalAmount: 1060000,
      items: [
        { name: "研发费用-技术服务费（节能研发项目）", quantity: 1, unitPrice: 1000000, amount: 1000000, taxRate: 0.06, taxAmount: 60000 },
      ],
    },
  },
  {
    label: "发票2（节能·教师操作）",
    hashes: ["6fdb73a2eac53ab811203d6fbf8d9b743ad0a2b4038e5c8dd55ec811fb62dd82"],
    nameKeywords: ["发票2"],
    parsed: {
      type: "增值税专用发票",
      number: "25352000001238127573",
      date: "2024-06-13",
      seller: "泉州绿能环保设备有限公司",
      buyer: "汇成针织有限公司",
      amount: 500000,
      taxRate: 0.13,
      taxAmount: 65000,
      totalAmount: 565000,
      items: [
        { name: "节能设备-余热回收装置 YH-100", quantity: 1, unitPrice: 500000, amount: 500000, taxRate: 0.13, taxAmount: 65000 },
      ],
    },
  },
  {
    label: "发票3（研发·学生实操）",
    hashes: ["a27c90b75e3934998c0f789ccfd6fbedb9e392ae7169d8369f87b1e24bd6f76e"],
    nameKeywords: ["发票3"],
    parsed: {
      type: "增值税专用发票",
      number: "26352000001238127782",
      date: "2025-07-09",
      seller: "泉州智创技术服务有限公司",
      buyer: "汇成针织有限公司",
      amount: 1760000,
      taxRate: 0.06,
      taxAmount: 105600,
      totalAmount: 1865600,
      items: [
        { name: "研发费用-技术服务费（节能研发项目）", quantity: 1, unitPrice: 1760000, amount: 1760000, taxRate: 0.06, taxAmount: 105600 },
      ],
    },
  },
  {
    label: "发票4（节能·学生实操）",
    hashes: ["677397cb85703f444d4ca984a6508aa3c42837228b172a6e945fc32b86d23654"],
    nameKeywords: ["发票4"],
    parsed: {
      type: "增值税专用发票",
      number: "25352000001238127671",
      date: "2025-10-15",
      seller: "泉州绿能环保设备有限公司",
      buyer: "汇成针织有限公司",
      amount: 1280000,
      taxRate: 0.13,
      taxAmount: 166400,
      totalAmount: 1446400,
      items: [
        { name: "节能设备-余热回收装置 YH-200", quantity: 1, unitPrice: 1280000, amount: 1280000, taxRate: 0.13, taxAmount: 166400 },
      ],
    },
  },
];

function toMarkdown(p: ExtractedInvoice): string {
  return [
    `# ${p.type}`,
    "",
    `- 发票号码：${p.number}`,
    `- 开票日期：${p.date}`,
    `- 销售方：${p.seller}`,
    `- 购买方：${p.buyer}`,
    `- 不含税金额：¥${p.amount.toLocaleString()}`,
    `- 税率：${(p.taxRate * 100).toFixed(0)}%`,
    `- 税额：¥${p.taxAmount.toLocaleString()}`,
    `- 价税合计：¥${p.totalAmount.toLocaleString()}`,
    "",
    "## 明细清单",
    ...p.items.map(
      (it) => `- ${it.name}　数量 ${it.quantity}　金额 ¥${it.amount.toLocaleString()}　税额 ¥${it.taxAmount.toLocaleString()}`,
    ),
  ].join("\n");
}

/**
 * 命中演示票据则返回预置识别结果，否则返回 null（走真实识别流程）。
 */
export function matchDemoInvoice(hash: string, fileName: string): { parsed: ExtractedInvoice; markdown: string } | null {
  const name = fileName || "";
  for (const entry of demoEntries) {
    const byHash = hash ? entry.hashes.includes(hash) : false;
    const byName = entry.nameKeywords.some((k) => name.includes(k));
    if (byHash || byName) {
      return { parsed: { ...entry.parsed, items: entry.parsed.items.map((it) => ({ ...it })) }, markdown: toMarkdown(entry.parsed) };
    }
  }
  return null;
}
