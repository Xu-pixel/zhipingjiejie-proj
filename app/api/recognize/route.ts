import JSZip from "jszip";

const MINERU_BASE = "https://mineru.net/api/v4";
const DEEPSEEK_BASE = "https://api.deepseek.com";
const MINERU_TOKEN = process.env.MINERU_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

if (!MINERU_TOKEN) {
  throw new Error("Missing MINERU_TOKEN environment variable");
}
if (!DEEPSEEK_KEY) {
  throw new Error("Missing DEEPSEEK_API_KEY environment variable");
}

function getMineruHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MINERU_TOKEN}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BatchStatus {
  state: string;
  fullZipUrl?: string;
  errMsg?: string;
}

async function queryBatchStatus(batchId: string): Promise<BatchStatus> {
  const res = await fetch(`${MINERU_BASE}/extract-results/batch/${batchId}`, {
    method: "GET",
    headers: getMineruHeaders(),
  });

  if (!res.ok) {
    throw new Error(`查询任务失败: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`API错误: ${json.msg || "未知错误"}`);
  }

  const data = json.data as {
    batch_id: string;
    extract_result?: Array<{
      file_name: string;
      state: string;
      full_zip_url?: string;
      err_msg?: string;
    }>;
  };

  const result = data.extract_result?.[0];
  if (!result) {
    return { state: "waiting-file" };
  }

  return {
    state: result.state,
    fullZipUrl: result.full_zip_url,
    errMsg: result.err_msg,
  };
}

async function downloadAndParse(zipUrl: string): Promise<string> {
  const res = await fetch(zipUrl);
  if (!res.ok) {
    throw new Error(`下载结果失败: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const mdFile = zip.file("full.md");
  if (!mdFile) {
    throw new Error("ZIP 中未找到 full.md");
  }

  return mdFile.async("string");
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

async function extractInvoiceWithLLM(markdown: string): Promise<ExtractedInvoice> {
  const systemPrompt = `你是一个专业的财务票据信息提取助手。请从用户提供的票据文本中提取关键信息，并以严格 JSON 格式返回，不要包含任何额外文字。

需要提取的字段及说明：
- type: 发票类型，如"增值税专用发票"、"增值税普通发票"等
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

如果某个字段无法从文本中找到，使用以下默认值：
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

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请从以下票据文本中提取信息并返回 JSON：\n\n${markdown}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepSeek API 调用失败: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error("DeepSeek 返回结果为空");
  }

  const parsed = JSON.parse(content) as Partial<ExtractedInvoice>;

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
 * 完整识别流程：MinerU 解析 → DeepSeek LLM 提取 → 返回结构化数据
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "未提供文件" }, { status: 400 });
    }

    // 1. 申请 MinerU 上传链接
    const files = [{ name: file.name, data_id: `invoice_${Date.now()}` }];
    const urlRes = await fetch(`${MINERU_BASE}/file-urls/batch`, {
      method: "POST",
      headers: getMineruHeaders(),
      body: JSON.stringify({
        files,
        model_version: "vlm",
        is_ocr: true,
        enable_table: true,
        language: "ch",
      }),
    });

    if (!urlRes.ok) {
      throw new Error(`申请上传链接失败: ${urlRes.status} ${urlRes.statusText}`);
    }

    const urlJson = await urlRes.json();
    if (urlJson.code !== 0) {
      throw new Error(`API错误: ${urlJson.msg || "未知错误"}`);
    }

    const { batch_id: batchId, file_urls: fileUrls } = urlJson.data as {
      batch_id: string;
      file_urls: string[];
    };

    const uploadUrl = fileUrls?.[0];
    if (!uploadUrl) throw new Error("未获取到上传链接");
    if (!batchId) throw new Error("未获取到批次ID");

    // 2. 后端 PUT 上传文件
    const arrayBuffer = await file.arrayBuffer();
    const putRes = await fetch(uploadUrl, { method: "PUT", body: arrayBuffer });
    if (!putRes.ok) {
      throw new Error(`文件上传失败: ${putRes.status} ${putRes.statusText}`);
    }

    // 3. 后端轮询等待解析完成
    let batchResult: BatchStatus;
    for (let i = 0; i < 120; i++) {
      batchResult = await queryBatchStatus(batchId);

      if (batchResult.state === "done") {
        break;
      }

      if (batchResult.state === "failed") {
        throw new Error(`解析失败: ${batchResult.errMsg || "未知错误"}`);
      }

      await sleep(3000);
    }

    if (!batchResult! || batchResult.state !== "done") {
      throw new Error("解析超时，请稍后重试");
    }

    if (!batchResult.fullZipUrl) {
      throw new Error("解析结果不可用");
    }

    // 4. 下载 ZIP 并解压得到 markdown
    const markdown = await downloadAndParse(batchResult.fullZipUrl);

    // 5. DeepSeek LLM 提取结构化发票信息
    const parsed = await extractInvoiceWithLLM(markdown);

    return Response.json({ markdown, parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "识别失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
