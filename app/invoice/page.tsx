"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp, type Invoice, type InvoiceItem } from "@/app/context/AppContext";
import { recognizeInvoice } from "@/app/services/mineruApi";
import Layout from "@/app/components/Layout";

function emptyItem(): InvoiceItem {
  return { name: "", quantity: 1, unitPrice: 0, amount: 0, taxRate: 0.13, taxAmount: 0 };
}

export default function InvoicePage() {
  const { isLoggedIn, invoices, addInvoice, updateInvoice, deleteInvoice } = useApp();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState("");
  const [parsedPreview, setParsedPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError("");
    setParsedPreview("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setIsRecognizing(true);
      setProgressMsg("正在初始化...");
      setProgressPercent(5);

      try {
        const { parsed, markdown } = await recognizeInvoice(file, (msg, pct) => {
          setProgressMsg(msg);
          setProgressPercent(pct || 0);
        });

        setParsedPreview(markdown.substring(0, 800));

        const invoiceId = `inv-${Date.now()}-${i}`;
        const invoice: Invoice = {
          id: invoiceId,
          type: parsed.type || "增值税专用发票",
          number: parsed.number || `AUTO-${Date.now().toString().slice(-8)}`,
          date: parsed.date || new Date().toISOString().split("T")[0],
          seller: parsed.seller || "未识别",
          buyer: parsed.buyer || "未识别",
          amount: parsed.amount || 0,
          taxRate: parsed.taxRate || 0.13,
          taxAmount: parsed.taxAmount || 0,
          totalAmount: parsed.totalAmount || 0,
          status: "recognized",
          items: parsed.items && parsed.items.length > 0
            ? parsed.items
            : [{
                name: parsed.seller ? `采购-${parsed.seller.slice(0, 10)}` : "未分类项目",
                quantity: 1,
                unitPrice: parsed.amount || 0,
                amount: parsed.amount || 0,
                taxRate: parsed.taxRate || 0.13,
                taxAmount: parsed.taxAmount || 0,
              }],
        };

        addInvoice(invoice);
        setSelectedId(invoiceId);
        setIsEditing(false);
        setProgressMsg("识别完成！");
        setProgressPercent(100);

        setTimeout(() => {
          setIsRecognizing(false);
          setProgressMsg("");
          setProgressPercent(0);
        }, 2000);

      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "识别失败";
        setError(`${file.name}: ${errorMsg}`);
        setIsRecognizing(false);
        setProgressMsg("");
        setProgressPercent(0);

        if (errorMsg.includes("fetch") || errorMsg.includes("Failed") || errorMsg.includes("CORS") || errorMsg.includes("Network")) {
          handleFallbackParse(file);
        }
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [addInvoice]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isRecognizing) setIsDragging(true);
  }, [isRecognizing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isRecognizing) return;
    processFiles(e.dataTransfer.files);
  }, [isRecognizing, processFiles]);

  const handleFallbackParse = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const fileName = file.name;
      const invoiceId = `inv-${Date.now()}`;

      const invoice: Invoice = {
        id: invoiceId,
        type: "增值税专用发票",
        number: `FILE-${fileName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`,
        date: new Date().toISOString().split("T")[0],
        seller: "从文件上传：" + fileName,
        buyer: "待识别",
        amount: 0,
        taxRate: 0.13,
        taxAmount: 0,
        totalAmount: 0,
        status: "recognized",
        items: [{
          name: `上传文件: ${fileName}`,
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          taxRate: 0.13,
          taxAmount: 0,
        }],
      };

      addInvoice(invoice);
      setSelectedId(invoiceId);
      setIsEditing(false);
      setError("识别服务暂不可用，已创建占位记录，请稍后重试。");
    };
    reader.readAsText(file);
  };

  const selectedInvoice = invoices.find((i) => i.id === selectedId);

  const startEdit = useCallback(() => {
    if (!selectedInvoice) return;
    setEditForm({ ...selectedInvoice });
    setIsEditing(true);
  }, [selectedInvoice]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({});
  }, []);

  const saveEdit = useCallback(() => {
    if (!selectedInvoice || !editForm) return;
    const updated: Partial<Invoice> = { ...editForm };
    const items = updated.items ?? selectedInvoice.items;
    const amount = items.reduce((s, it) => s + (it.amount || 0), 0);
    const taxAmount = items.reduce((s, it) => s + (it.taxAmount || 0), 0);
    updated.amount = amount;
    updated.taxAmount = taxAmount;
    updated.totalAmount = amount + taxAmount;
    updateInvoice(selectedInvoice.id, updated);
    setIsEditing(false);
    setEditForm({});
  }, [selectedInvoice, editForm, updateInvoice]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm("确定要删除这张票据吗？")) return;
    deleteInvoice(id);
    if (selectedId === id) {
      setSelectedId(null);
      setIsEditing(false);
      setEditForm({});
    }
  }, [deleteInvoice, selectedId]);

  const updateEditField = <K extends keyof Invoice>(field: K, value: Invoice[K]) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItemField = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setEditForm((prev) => {
      const items = [...(prev.items ?? selectedInvoice?.items ?? [])];
      const it = { ...items[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(value) : Number(it.quantity);
        const up = field === "unitPrice" ? Number(value) : Number(it.unitPrice);
        it.amount = Math.round(qty * up * 100) / 100;
      }
      if (field === "amount" || field === "taxRate") {
        const amt = field === "amount" ? Number(value) : Number(it.amount);
        const tr = field === "taxRate" ? Number(value) : Number(it.taxRate);
        it.taxAmount = Math.round(amt * tr * 100) / 100;
      }
      items[idx] = it;
      return { ...prev, items };
    });
  };

  const removeItem = (idx: number) => {
    setEditForm((prev) => {
      const items = [...(prev.items ?? selectedInvoice?.items ?? [])];
      items.splice(idx, 1);
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setEditForm((prev) => {
      const items = [...(prev.items ?? selectedInvoice?.items ?? []), emptyItem()];
      return { ...prev, items };
    });
  };

  if (!isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">票据识别</h1>
            <p className="text-sm text-slate-500">智能识别票据信息，自动提取关键字段</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              已识别 {invoices.filter((i) => i.status !== "pending").length} 张
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isRecognizing
                ? "border-emerald-400 bg-emerald-50/50"
                : isDragging
                ? "border-emerald-500 bg-emerald-100/50"
                : "border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-50/50"
            }`}
            onClick={() => !isRecognizing && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.html"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isRecognizing}
            />

            {isRecognizing ? (
              <div>
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-700 mb-2">{progressMsg}</p>
                <div className="w-64 h-2 bg-emerald-200 rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">正在智能解析中，请稍候</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  {isDragging ? "松开鼠标完成上传" : "点击或拖拽上传票据图片或文档"}
                </p>
                <p className="text-xs text-slate-500">支持 PDF、PNG、JPG、WebP、GIF、BMP、Word、PPT、Excel、HTML</p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 space-y-2">
            <h3 className="text-sm font-bold text-slate-700 mb-2">已识别票据</h3>
            {invoices.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">暂无票据，请先上传</p>
              </div>
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv.id}
                  className={`group relative w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedId === inv.id
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                  onClick={() => { setSelectedId(inv.id); setIsEditing(false); }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="flex items-center justify-between mb-1 pr-6">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {inv.type}
                    </span>
                    <span className={`text-xs ${
                      inv.status === "recognized" ? "text-emerald-600" : "text-amber-600"
                    }`}>
                      {inv.status === "recognized" ? "已识别" : inv.status === "calculated" ? "已计算" : "待处理"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">{inv.seller}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{inv.number}</span>
                    <span className="text-sm font-bold text-slate-700">¥{inv.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="col-span-3">
            {selectedInvoice ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">票据详情</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {selectedInvoice.type}
                    </span>
                    {!isEditing && (
                      <>
                        <button
                          onClick={startEdit}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(selectedInvoice.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">发票类型</label>
                        <select
                          className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          value={editForm.type ?? selectedInvoice.type}
                          onChange={(e) => updateEditField("type", e.target.value)}
                        >
                          <option>增值税专用发票</option>
                          <option>增值税普通发票</option>
                          <option>电子发票</option>
                          <option>机动车销售统一发票</option>
                          <option>其他</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">发票号码</label>
                        <input
                          className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          value={editForm.number ?? selectedInvoice.number}
                          onChange={(e) => updateEditField("number", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">开票日期</label>
                        <input
                          type="date"
                          className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          value={editForm.date ?? selectedInvoice.date}
                          onChange={(e) => updateEditField("date", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">税率</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          value={editForm.taxRate ?? selectedInvoice.taxRate}
                          onChange={(e) => updateEditField("taxRate", Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">销方名称</label>
                        <input
                          className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          value={editForm.seller ?? selectedInvoice.seller}
                          onChange={(e) => updateEditField("seller", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">购方名称</label>
                        <input
                          className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                          value={editForm.buyer ?? selectedInvoice.buyer}
                          onChange={(e) => updateEditField("buyer", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">明细清单</h4>
                      <button
                        onClick={addItem}
                        className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        添加行
                      </button>
                    </div>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600">
                            <th className="text-left py-2 px-2 rounded-tl-lg text-xs">项目名称</th>
                            <th className="text-right py-2 px-2 text-xs">数量</th>
                            <th className="text-right py-2 px-2 text-xs">单价</th>
                            <th className="text-right py-2 px-2 text-xs">金额</th>
                            <th className="text-right py-2 px-2 text-xs">税率</th>
                            <th className="text-right py-2 px-2 rounded-tr-lg text-xs">税额</th>
                            <th className="text-center py-2 px-2 text-xs w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editForm.items ?? selectedInvoice.items).map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="py-1.5 px-1">
                                <input
                                  className="w-full text-xs border border-slate-300 rounded px-1.5 py-1 focus:outline-none focus:border-emerald-500"
                                  value={item.name}
                                  onChange={(e) => updateItemField(idx, "name", e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  className="w-16 text-xs border border-slate-300 rounded px-1.5 py-1 text-right focus:outline-none focus:border-emerald-500"
                                  value={item.quantity}
                                  onChange={(e) => updateItemField(idx, "quantity", Number(e.target.value))}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-20 text-xs border border-slate-300 rounded px-1.5 py-1 text-right focus:outline-none focus:border-emerald-500"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItemField(idx, "unitPrice", Number(e.target.value))}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-20 text-xs border border-slate-300 rounded px-1.5 py-1 text-right focus:outline-none focus:border-emerald-500"
                                  value={item.amount}
                                  onChange={(e) => updateItemField(idx, "amount", Number(e.target.value))}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-16 text-xs border border-slate-300 rounded px-1.5 py-1 text-right focus:outline-none focus:border-emerald-500"
                                  value={item.taxRate}
                                  onChange={(e) => updateItemField(idx, "taxRate", Number(e.target.value))}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-20 text-xs border border-slate-300 rounded px-1.5 py-1 text-right focus:outline-none focus:border-emerald-500"
                                  value={item.taxAmount}
                                  onChange={(e) => updateItemField(idx, "taxAmount", Number(e.target.value))}
                                />
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <button
                                  onClick={() => removeItem(idx)}
                                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                                  title="删除行"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        保存修改
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">发票号码</p>
                        <p className="text-sm font-medium text-slate-800">{selectedInvoice.number}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">开票日期</p>
                        <p className="text-sm font-medium text-slate-800">{selectedInvoice.date}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">销方名称</p>
                        <p className="text-sm font-medium text-slate-800">{selectedInvoice.seller}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">购方名称</p>
                        <p className="text-sm font-medium text-slate-800">{selectedInvoice.buyer}</p>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">明细清单</h4>
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="text-left py-2 px-2 rounded-tl-lg text-xs">项目名称</th>
                          <th className="text-right py-2 px-2 text-xs">数量</th>
                          <th className="text-right py-2 px-2 text-xs">单价</th>
                          <th className="text-right py-2 px-2 text-xs">金额</th>
                          <th className="text-right py-2 px-2 rounded-tr-lg text-xs">税额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="py-2 px-2 text-slate-700">{item.name}</td>
                            <td className="text-right py-2 px-2 text-slate-600">{item.quantity}</td>
                            <td className="text-right py-2 px-2 text-slate-600">¥{item.unitPrice.toLocaleString()}</td>
                            <td className="text-right py-2 px-2 text-slate-700 font-medium">¥{item.amount.toLocaleString()}</td>
                            <td className="text-right py-2 px-2 text-emerald-600">¥{item.taxAmount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">不含税金额</span>
                        <span className="font-medium text-slate-800">¥{selectedInvoice.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">税率</span>
                        <span className="font-medium text-slate-800">{(selectedInvoice.taxRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">税额</span>
                        <span className="font-medium text-emerald-600">¥{selectedInvoice.taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
                        <span className="text-slate-800">价税合计</span>
                        <span className="text-emerald-600">¥{selectedInvoice.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => updateInvoice(selectedInvoice.id, { status: "calculated" })}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        确认并进入税额计算
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">选择左侧票据查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
