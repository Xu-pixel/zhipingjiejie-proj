const VLLM_MODEL = "Kimi-K2.6";

function getVllmConfig() {
  const apiKey = process.env.VLLM_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VLLM_API_KEY environment variable");
  }
  return {
    url: process.env.VLLM_URL || "https://llmapi.blsc.cn",
    apiKey,
  };
}

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

const SYSTEM_PROMPT = `你是一个专业的财务票据识别与信息提取助手。请仔细查看用户上传的票据图片或文本，提取以下字段并以严格 JSON 格式返回，不要包含任何额外文字（如 markdown 代码块标记）。

需要提取的字段及说明：
- type: 发票类型，如"增值税专用发票"、"增值税普通发票"、"电子发票"、"机动车销售统一发票"等
- number: 发票号码
- date: 开票日期，格式统一为 YYYY-MM-DD
- seller: 销方名称（销售方）
- buyer: 购方名称（购买方）
- amount: 不含税金额（数值）
- taxRate: 税率，如 0.13 表示 13%
- taxAmount: 税额（数值）
- totalAmount: 价税合计（数值）
- items: 商品明细数组，每个元素包含：
  - name: 商品名称
  - quantity: 数量（数值）
  - unitPrice: 单价（数值）
  - amount: 金额（数值）
  - taxRate: 税率
  - taxAmount: 税额（数值）

如果某个字段无法找到，使用以下默认值：
- type: "增值税专用发票"
- number: ""
- date: 当天日期
- seller: "未识别"
- buyer: "未识别"
- amount: 0
- taxRate: 0.13
- taxAmount: 0
- totalAmount: 0
- items: []`;

function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

async function callVLLM(
  content: Array<{ type: string; [key: string]: unknown }>
): Promise<ExtractedInvoice> {
  const { url, apiKey } = getVllmConfig();
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VLLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`VLLM API 调用失败: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content as string | undefined;
  if (!text) {
    throw new Error("VLLM 返回结果为空");
  }

  // 清理可能的 markdown 代码块、引用符号等噪音
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^>\s?/gm, "")
    .trim();
  const parsed = JSON.parse(clean) as Partial<ExtractedInvoice>;

  const today = new Date().toISOString().split("T")[0];
  return {
    type: parsed.type || "增值税专用发票",
    number: parsed.number || "",
    date: parsed.date || today,
    seller: parsed.seller || "未识别",
    buyer: parsed.buyer || "未识别",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    taxRate: typeof parsed.taxRate === "number" ? parsed.taxRate : 0.13,
    taxAmount: typeof parsed.taxAmount === "number" ? parsed.taxAmount : 0,
    totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : 0,
    items: Array.isArray(parsed.items)
      ? parsed.items.map((it) => ({
          name: it.name || "",
          quantity: typeof it.quantity === "number" ? it.quantity : 1,
          unitPrice: typeof it.unitPrice === "number" ? it.unitPrice : 0,
          amount: typeof it.amount === "number" ? it.amount : 0,
          taxRate: typeof it.taxRate === "number" ? it.taxRate : 0.13,
          taxAmount: typeof it.taxAmount === "number" ? it.taxAmount : 0,
        }))
      : [],
  };
}

/**
 * POST /api/recognize
 * 直接调用 VLLM 多模态模型（Kimi-K2.6）识别票据并提取结构化信息
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "未提供文件" }, { status: 400 });
    }

    let content: Array<{ type: string; [key: string]: unknown }>;

    if (isImageType(file.type)) {
      // 图片文件：转为 base64 data URL
      const bytes = await file.bytes();
      const base64 = Buffer.from(bytes).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      content = [
        { type: "text", text: "请识别以下票据图片，提取发票信息并以 JSON 格式返回。" },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    } else {
      // 非图片文件：尝试读取文本内容
      const textContent = await file.text().catch(() => "");
      if (!textContent.trim()) {
        return Response.json(
          { error: "无法读取该文件内容，请上传图片格式（PNG、JPG 等）的票据" },
          { status: 400 }
        );
      }
      content = [
        { type: "text", text: `请从以下票据文本中提取发票信息并以 JSON 格式返回：\n\n${textContent}` },
      ];
    }

    const parsed = await callVLLM(content);

    // 构造一个 markdown 摘要用于前端预览
    const markdown = [
      `## 发票识别结果`,
      "",
      `- **发票类型**: ${parsed.type}`,
      `- **发票号码**: ${parsed.number}`,
      `- **开票日期**: ${parsed.date}`,
      `- **销方名称**: ${parsed.seller}`,
      `- **购方名称**: ${parsed.buyer}`,
      `- **不含税金额**: ¥${parsed.amount.toLocaleString()}`,
      `- **税率**: ${(parsed.taxRate * 100).toFixed(0)}%`,
      `- **税额**: ¥${parsed.taxAmount.toLocaleString()}`,
      `- **价税合计**: ¥${parsed.totalAmount.toLocaleString()}`,
      "",
      "### 明细清单",
      "",
      ...parsed.items.map(
        (it, i) =>
          `${i + 1}. ${it.name} × ${it.quantity} @ ¥${it.unitPrice.toLocaleString()} = ¥${it.amount.toLocaleString()} (税额 ¥${it.taxAmount.toLocaleString()})`
      ),
    ].join("\n");

    return Response.json({ markdown, parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "识别失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
