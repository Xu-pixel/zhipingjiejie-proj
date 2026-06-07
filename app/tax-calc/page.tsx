"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

export default function TaxCalculationPage() {
  const { isLoggedIn, invoices, updateInvoice } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  const recognizedInvoices = invoices.filter((i) => i.status !== "pending");

  const summary = useMemo(() => {
    const totalAmount = recognizedInvoices.reduce((s, i) => s + i.amount, 0);
    const totalTax = recognizedInvoices.reduce((s, i) => s + i.taxAmount, 0);
    const totalWithTax = recognizedInvoices.reduce((s, i) => s + i.totalAmount, 0);

    const byRate: Record<string, { amount: number; tax: number; count: number }> = {};
    recognizedInvoices.forEach((inv) => {
      const rate = `${(inv.taxRate * 100).toFixed(0)}%`;
      if (!byRate[rate]) byRate[rate] = { amount: 0, tax: 0, count: 0 };
      byRate[rate].amount += inv.amount;
      byRate[rate].tax += inv.taxAmount;
      byRate[rate].count += 1;
    });

    return { totalAmount, totalTax, totalWithTax, byRate };
  }, [recognizedInvoices]);

  const allCalculated = recognizedInvoices.every((i) => i.status === "calculated" || i.status === "declared");

  const handleConfirmAll = () => {
    recognizedInvoices.forEach((inv) => {
      if (inv.status === "recognized") {
        updateInvoice(inv.id, { status: "calculated" });
      }
    });
  };

  if (!isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">税额自动计算</h1>
            <p className="text-sm text-slate-500">基于已识别票据，自动计算进项税额与应纳税额</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">不含税金额合计</p>
            <p className="text-2xl font-bold text-blue-700">¥{summary.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
            <p className="text-xs text-emerald-600 mb-1">进项税额合计</p>
            <p className="text-2xl font-bold text-emerald-700">¥{summary.totalTax.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs text-amber-600 mb-1">价税合计</p>
            <p className="text-2xl font-bold text-amber-700">¥{summary.totalWithTax.toLocaleString()}</p>
          </div>
        </div>

        {Object.keys(summary.byRate).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">按税率汇总</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(summary.byRate).map(([rate, data]) => (
                <div key={rate} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">税率 {rate}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{data.count} 张</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">金额</span>
                    <span className="font-medium text-slate-700">¥{data.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-500">税额</span>
                    <span className="font-medium text-emerald-600">¥{data.tax.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">票据税额明细</h3>
            {!allCalculated && recognizedInvoices.length > 0 && (
              <button
                onClick={handleConfirmAll}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                确认全部计算结果
              </button>
            )}
          </div>

          {recognizedInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">暂无已识别票据，请先完成票据识别</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs">
                    <th className="text-left py-3 px-4">发票号码</th>
                    <th className="text-left py-3 px-4">销方名称</th>
                    <th className="text-right py-3 px-4">不含税金额</th>
                    <th className="text-right py-3 px-4">税率</th>
                    <th className="text-right py-3 px-4">进项税额</th>
                    <th className="text-right py-3 px-4">价税合计</th>
                    <th className="text-center py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {recognizedInvoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{inv.number}</td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[150px]">{inv.seller}</td>
                      <td className="text-right py-3 px-4 text-slate-700">¥{inv.amount.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          {(inv.taxRate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 text-emerald-600 font-medium">¥{inv.taxAmount.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-slate-700 font-medium">¥{inv.totalAmount.toLocaleString()}</td>
                      <td className="text-center py-3 px-4">
                        {inv.status === "calculated" || inv.status === "declared" ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">已确认</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">待确认</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <td className="py-3 px-4 text-slate-700" colSpan={2}>合计</td>
                    <td className="text-right py-3 px-4 text-slate-700">¥{summary.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-4" />
                    <td className="text-right py-3 px-4 text-emerald-600">¥{summary.totalTax.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-slate-700">¥{summary.totalWithTax.toLocaleString()}</td>
                    <td className="py-3 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">计算公式说明</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">1.</span>
              <p><strong>进项税额</strong> = 不含税金额 × 适用税率</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">2.</span>
              <p><strong>销项税额</strong> = 销售额 × 适用税率（本环节为进项税额抵扣）</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">3.</span>
              <p><strong>应纳税额</strong> = 当期销项税额 − 当期进项税额</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">4.</span>
              <p><strong>加计抵减额</strong> = 可抵扣进项税额 × 加计抵减比例（生产性服务业5%，生活性服务业10%）</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
