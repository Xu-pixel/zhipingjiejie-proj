"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

export default function DeclarationPage() {
  const { isLoggedIn, invoices, deductions, declarations, addDeclaration } = useApp();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [period, setPeriod] = useState("2024-05");

  useEffect(() => {
    if (!isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  const recognizedInvoices = invoices.filter((i) => i.status === "calculated" || i.status === "declared");
  const submittedDeductions = deductions.filter((d) => d.status === "submitted");

  const totalInputTax = recognizedInvoices.reduce((s, i) => s + i.taxAmount, 0);
  const totalDeduction = submittedDeductions.reduce((s, d) => s + d.deductionAmount, 0);
  const netTax = Math.max(0, totalInputTax - totalDeduction);

  const handleDeclare = () => {
    addDeclaration({
      id: `dec-${Date.now()}`,
      period,
      invoiceCount: recognizedInvoices.length,
      totalInputTax,
      totalDeduction,
      netTax,
      status: "submitted",
      submitDate: new Date().toISOString().split("T")[0],
    });
    setShowConfirm(false);
  };

  if (!isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">智能申报</h1>
          <p className="text-sm text-slate-500">提交增值税申报，完成税务申报全流程</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">申报期间</p>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-lg font-bold text-slate-800 bg-transparent outline-none w-full"
            />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">进项税额</p>
            <p className="text-lg font-bold text-blue-600">¥{totalInputTax.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">加计抵减额</p>
            <p className="text-lg font-bold text-violet-600">¥{totalDeduction.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">实际应纳税额</p>
            <p className="text-lg font-bold text-emerald-600">¥{netTax.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">
                已确认票据（{recognizedInvoices.length}张）
              </h3>
            </div>
            {recognizedInvoices.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                请先完成票据识别和税额计算
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {recognizedInvoices.map((inv) => (
                  <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-700">{inv.seller}</p>
                      <p className="text-xs text-slate-400 font-mono">{inv.number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-600">¥{inv.taxAmount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">税额</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">
                已提交抵减（{submittedDeductions.length}项）
              </h3>
            </div>
            {submittedDeductions.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                请先完成加计抵减填报
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {submittedDeductions.map((ded) => (
                  <div key={ded.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-700">{ded.description}</p>
                      <p className="text-xs text-violet-600">{ded.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-600">¥{ded.deductionAmount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">抵减额</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">准备提交申报</h3>
            <p className="text-xs text-slate-500">
              共 {recognizedInvoices.length} 张票据，{submittedDeductions.length} 项加计抵减
              ，预计应纳税额 <span className="font-bold text-emerald-600">¥{netTax.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={recognizedInvoices.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-200"
          >
            提交智能申报
          </button>
        </div>

        {declarations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-700 mb-3">申报记录</h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="text-left py-3 px-4">申报编号</th>
                    <th className="text-left py-3 px-4">申报期间</th>
                    <th className="text-right py-3 px-4">票据数</th>
                    <th className="text-right py-3 px-4">进项税额</th>
                    <th className="text-right py-3 px-4">抵减额</th>
                    <th className="text-right py-3 px-4">应纳税额</th>
                    <th className="text-center py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((dec) => (
                    <tr key={dec.id} className="border-t border-slate-100">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{dec.id}</td>
                      <td className="py-3 px-4 text-slate-700">{dec.period}</td>
                      <td className="text-right py-3 px-4 text-slate-700">{dec.invoiceCount}</td>
                      <td className="text-right py-3 px-4 text-blue-600">¥{dec.totalInputTax.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-violet-600">¥{dec.totalDeduction.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-emerald-600 font-medium">¥{dec.netTax.toFixed(2)}</td>
                      <td className="text-center py-3 px-4">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          已提交
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">确认提交申报？</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">申报期间</span>
                  <span className="font-medium text-slate-700">{period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">票据数量</span>
                  <span className="font-medium text-slate-700">{recognizedInvoices.length} 张</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">进项税额</span>
                  <span className="font-medium text-blue-600">¥{totalInputTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">加计抵减额</span>
                  <span className="font-medium text-violet-600">¥{totalDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-medium text-slate-700">实际应纳税额</span>
                  <span className="font-bold text-emerald-600">¥{netTax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeclare}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  确认提交
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
