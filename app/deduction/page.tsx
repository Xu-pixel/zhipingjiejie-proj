"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

const deductionCategories = [
  { value: "rd", label: "研发费用（100%）", rate: 1.0 },
  { value: "energy", label: "节能设备抵免（15%）", rate: 0.15 },
  { value: "green", label: "绿色采购加计抵减（15%）", rate: 0.15 },
  { value: "tech", label: "科技研发加计抵减（10%）", rate: 0.10 },
];

export default function DeductionPage() {
  const { isLoggedIn, hydrated, invoices, deductions, addDeduction, updateDeduction } = useApp();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("rd");
  const [period, setPeriod] = useState("2026-06");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push("/");
  }, [hydrated, isLoggedIn, router]);

  const recognizedInvoices = invoices.filter((i) => i.status === "calculated" || i.status === "declared");
  const totalInputTax = recognizedInvoices.reduce((s, i) => s + i.taxAmount, 0);

  const handleSubmit = () => {
    const cat = deductionCategories.find((c) => c.value === category);
    if (!cat) return;

    const inputTax = totalInputTax;
    const deductionAmount = +(inputTax * cat.rate).toFixed(2);

    addDeduction({
      id: `ded-${Date.now()}`,
      period,
      inputTax,
      deductionRate: cat.rate,
      deductionAmount,
      category: cat.label,
      description: description || `${cat.label}加计抵减申报`,
      status: "draft",
    });

    setShowForm(false);
    setDescription("");
  };

  const handleSubmitDeduction = (id: string) => {
    updateDeduction(id, { status: "submitted" });
  };

  if (!isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">加计抵减填报</h1>
            <p className="text-sm text-slate-500">填写企业所得税加计扣除申报表，享受税收优惠</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新增抵减项
          </button>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-emerald-800 mb-3">当期可抵扣进项税额</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-emerald-600 mb-1">已确认票据数</p>
              <p className="text-xl font-bold text-emerald-700">{recognizedInvoices.length} <span className="text-sm font-normal">张</span></p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 mb-1">进项税额合计</p>
              <p className="text-xl font-bold text-emerald-700">¥{totalInputTax.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 mb-1">最大抵减额（按15%）</p>
              <p className="text-xl font-bold text-emerald-700">¥{(totalInputTax * 0.15).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">新增加计抵减申报</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">申报期间</label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">抵减类别</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                >
                  {deductionCategories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">说明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入抵减说明..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                确认添加
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-700">加计抵减记录</h3>
          </div>

          {deductions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 mb-1">暂无抵减记录</p>
              <p className="text-xs text-slate-400">点击"新增抵减项"创建加计抵减申报</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deductions.map((ded) => (
                <div key={ded.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                        {ded.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ded.status === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {ded.status === "submitted" ? "已提交" : "草稿"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{ded.period}</span>
                  </div>

                  <p className="text-sm text-slate-600 mb-2">{ded.description}</p>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">进项税额</p>
                      <p className="text-sm font-medium text-slate-700">¥{ded.inputTax.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">抵减率</p>
                      <p className="text-sm font-medium text-violet-600">{(ded.deductionRate * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">抵减额</p>
                      <p className="text-sm font-bold text-emerald-600">¥{ded.deductionAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {ded.status === "draft" && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSubmitDeduction(ded.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        提交申报
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-bold text-amber-800 mb-1">政策依据</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              根据《关于深化增值税改革有关政策的公告》，自2024年1月1日至2024年12月31日，允许生产性服务业纳税人按照当期可抵扣进项税额加计5%抵减应纳税额，生活性服务业纳税人按照当期可抵扣进项税额加计10%抵减应纳税额。绿色采购可享受15%加计抵减优惠。
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
