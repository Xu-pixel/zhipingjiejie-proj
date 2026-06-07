"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

export default function ReportPage() {
  const { isLoggedIn, hydrated, studentName, declarations } = useApp();
  const router = useRouter();
  const [selectedDec, setSelectedDec] = useState<string | null>(
    declarations.length > 0 ? declarations[0].id : null
  );

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push("/");
  }, [hydrated, isLoggedIn, router]);

  const declaration = declarations.find((d) => d.id === selectedDec);

  if (!isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">申报报告</h1>
          <p className="text-sm text-slate-500">查看和下载《绿色采购抵扣申报报告》</p>
        </div>

        {declarations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-1">暂无申报记录</p>
            <p className="text-xs text-slate-400">请先完成智能申报流程</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3">申报记录</h3>
              <div className="space-y-2">
                {declarations.map((dec) => (
                  <button
                    key={dec.id}
                    onClick={() => setSelectedDec(dec.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedDec === dec.id
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-500">{dec.id}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                        已提交
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{dec.period} 申报</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">{dec.invoiceCount} 张票据</span>
                      <span className="text-sm font-bold text-emerald-600">¥{dec.netTax.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-3">
              {declaration ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">已生成</span>
                    </div>
                    <h2 className="text-lg font-bold">《绿色采购抵扣申报报告》</h2>
                    <p className="text-emerald-100 text-sm mt-1">申报期间：{declaration.period}</p>
                  </div>

                  <div className="p-6">
                    <div className="mb-5 pb-5 border-b border-slate-200">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">申报人信息</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">姓名：</span>
                          <span className="text-slate-800">{studentName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">申报编号：</span>
                          <span className="text-slate-800 font-mono">{declaration.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">提交日期：</span>
                          <span className="text-slate-800">{declaration.submitDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">申报期间：</span>
                          <span className="text-slate-800">{declaration.period}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-5 pb-5 border-b border-slate-200">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">税额汇总</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">进项税额合计</span>
                          <span className="font-medium text-slate-800">¥{declaration.totalInputTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">加计抵减额</span>
                          <span className="font-medium text-violet-600">-¥{declaration.totalDeduction.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">涉及票据数</span>
                          <span className="font-medium text-slate-800">{declaration.invoiceCount} 张</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-100">
                          <span className="text-slate-800">实际应纳税额</span>
                          <span className="text-emerald-600">¥{declaration.netTax.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-4 mb-5">
                      <h4 className="text-sm font-bold text-emerald-800 mb-2">绿色采购说明</h4>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        本次申报涉及的采购项目均为节能环保产品，符合绿色采购税收优惠政策。
                        根据相关政策，享受增值税加计抵减优惠，有效降低企业税负。
                        所有票据已通过3D智慧财税仿真平台AI识别验证，确保数据准确无误。
                      </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">平台认证通过</p>
                        <p className="text-xs text-slate-500">3D智慧财税仿真平台 · AI智能审核</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                    <button
                      onClick={() => alert("报告已下载")}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      下载报告
                    </button>
                    <button
                      onClick={() => alert("报告已打印")}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-white border border-slate-200 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      打印
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-12 text-center">
                  <p className="text-sm text-slate-400">选择左侧申报记录查看报告</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
