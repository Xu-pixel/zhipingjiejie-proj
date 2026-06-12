/**
 * 演示票据「假装识别」表
 * 上传文件命中（按 SHA-256 文件哈希，或文件名关键字兜底）时，
 * 直接返回预置的识别结果，绕过真实 OCR/大模型，确保演示稳定可复现。
 *
 * 教师、学生各一张节能设备发票（设备抵免来自发票，研发费用等为题目给定参数）。
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
    label: "发票（教师操作）·节能设备 YH-100",
    hashes: ["1256300c20b817b24748941931cadd21c69ae00a12898ff480301b1a63562963"],
    nameKeywords: ["教师操作"],
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
    label: "发票（学生实操）·节能设备 YH-200",
    hashes: ["d357c093fbd293d626ffb595915fc070397cccd8525da0647ca149b7a310ffdd"],
    nameKeywords: ["学生实操"],
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
