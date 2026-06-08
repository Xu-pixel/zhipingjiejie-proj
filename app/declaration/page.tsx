"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, type PrepayReturn } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

const RATE = 0.25;
const SMALL_MICRO_CEILING = 3_000_000; // 实际利润额 ≤ 300万 适用小型微利测算
const SMALL_MICRO_EFFECTIVE = 0.05; // 小型微利企业实际税负 5%

const officialFiles = [
  { label: "填报说明（.doc）", href: "/forms/qysds-prepay-A-2020-instructions.doc", download: "企业所得税月（季）度预缴纳税申报表（A类）填报说明.doc" },
  { label: "空白表模板（.xlsx）", href: "/forms/qysds-prepay-A-blank.xlsx", download: "企业所得税月（季）度预缴纳税申报表（A类）空白表.xlsx" },
];

interface FormState {
  revenue: number;
  cost: number;
  profit: number;
  specialTaxable: number;
  nonTaxIncome: number;
  accelDepr: number;
  taxFreeAndExtra: number;
  incomeReduction: number;
  lossOffset: number;
  taxRelief: number;
  prepaid: number;
  specialPrepaid: number;
  smallMicro: boolean;
}

const emptyForm: FormState = {
  revenue: 0,
  cost: 0,
  profit: 0,
  specialTaxable: 0,
  nonTaxIncome: 0,
  accelDepr: 0,
  taxFreeAndExtra: 0,
  incomeReduction: 0,
  lossOffset: 0,
  taxRelief: 0,
  prepaid: 0,
  specialPrepaid: 0,
  smallMicro: false,
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function fmt(n: number) {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DeclarationPage() {
  const { isLoggedIn, hydrated, studentName, invoices, deductions, declarations, addDeclaration } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState("2026-06");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push("/");
  }, [hydrated, isLoggedIn, router]);

  const recognizedInvoices = invoices.filter((i) => i.status === "calculated" || i.status === "declared");
  const submittedDeductions = deductions.filter((d) => d.status === "submitted");
  const deductionTotal = round2(submittedDeductions.reduce((s, d) => s + d.deductionAmount, 0));

  // 计算行：10 实际利润额、12 应纳所得税额、16 本期应补（退）所得税额
  const calc = useMemo(() => {
    const taxableProfit = round2(
      form.profit +
        form.specialTaxable -
        form.nonTaxIncome -
        form.accelDepr -
        form.taxFreeAndExtra -
        form.incomeReduction -
        form.lossOffset,
    );
    const taxBase = Math.max(0, taxableProfit);
    const taxPayable = round2(taxBase * RATE);
    const taxDue = round2(taxPayable - form.taxRelief - form.prepaid - form.specialPrepaid);
    return { taxableProfit, taxBase, taxPayable, taxDue };
  }, [form]);

  // 小型微利测算：应纳税所得额 ≤ 300万，按 5% 实际税负，差额即为可减免所得税额
  const smallMicroRelief = useMemo(() => {
    if (!form.smallMicro || calc.taxBase <= 0 || calc.taxableProfit > SMALL_MICRO_CEILING) return 0;
    return Math.max(0, round2(calc.taxPayable - round2(calc.taxBase * SMALL_MICRO_EFFECTIVE)));
  }, [form.smallMicro, calc]);

  const setField = (key: keyof FormState, value: number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pullDeduction = () => setField("taxFreeAndExtra", deductionTotal);
  const applySmallMicroRelief = () => setField("taxRelief", smallMicroRelief);

  const handleDeclare = () => {
    const prepay: PrepayReturn = {
      revenue: form.revenue,
      cost: form.cost,
      profit: form.profit,
      specialTaxable: form.specialTaxable,
      nonTaxIncome: form.nonTaxIncome,
      accelDepr: form.accelDepr,
      taxFreeAndExtra: form.taxFreeAndExtra,
      incomeReduction: form.incomeReduction,
      lossOffset: form.lossOffset,
      taxableProfit: calc.taxableProfit,
      rate: RATE,
      taxPayable: calc.taxPayable,
      taxRelief: form.taxRelief,
      prepaid: form.prepaid,
      specialPrepaid: form.specialPrepaid,
      taxDue: calc.taxDue,
      smallMicro: form.smallMicro,
    };
    addDeclaration({
      id: `dec-${Date.now()}`,
      period,
      invoiceCount: recognizedInvoices.length,
      totalInputTax: calc.taxPayable,
      totalDeduction: form.taxRelief,
      netTax: calc.taxDue,
      status: "submitted",
      submitDate: new Date().toISOString().split("T")[0],
      prepay,
    });
    setShowConfirm(false);
  };

  if (!hydrated || !isLoggedIn) return null;

  // 预缴税款计算行配置（行号对应官方表样）
  const inputRows: { no: string; label: string; key: keyof FormState; hint?: string }[] = [
    { no: "1", label: "营业收入", key: "revenue" },
    { no: "2", label: "营业成本", key: "cost" },
    { no: "3", label: "利润总额", key: "profit" },
    { no: "4", label: "加：特定业务计算的应纳税所得额", key: "specialTaxable" },
    { no: "5", label: "减：不征税收入", key: "nonTaxIncome" },
    { no: "6", label: "减：资产加速折旧、摊销（扣除）调减额", key: "accelDepr" },
    { no: "7", label: "减：免税收入、减计收入、加计扣除", key: "taxFreeAndExtra", hint: "已提交加计扣除自动带入，可手工调整" },
    { no: "8", label: "减：所得减免", key: "incomeReduction" },
    { no: "9", label: "减：弥补以前年度亏损", key: "lossOffset" },
  ];

  const taxDuePositive = calc.taxDue >= 0;

  return (
    <Layout>
      <div className="p-6 w-full max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">智能申报</h1>
          <p className="text-sm text-slate-600">
            按《企业所得税月（季）度预缴纳税申报表（A类）》主表填报，自动计算实际利润额与本期应补（退）所得税额
          </p>
        </header>

        {/* 官方表单范本 + 下载 */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800">官方申报表范本</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                中华人民共和国企业所得税月（季）度预缴纳税申报表（A类，2018年版，2020修订）·国家税务总局监制。下表按官方表样实现，可对照填报说明逐行核对。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {officialFiles.map((f) => (
                <a
                  key={f.href}
                  href={f.href}
                  download={f.download}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {f.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* 表头信息 */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="period" className="block text-xs font-medium text-slate-500 mb-1.5">税款所属期间</label>
              <input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">纳税人名称</span>
              <p className="px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700 truncate">{studentName || "学生用户"}</p>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">预缴方式</span>
              <p className="px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700">按照实际利润额预缴</p>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 w-fit cursor-pointer">
            <input
              type="checkbox"
              checked={form.smallMicro}
              onChange={(e) => setField("smallMicro", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            小型微利企业（实际利润额 ≤ 300万元，从业人数、资产总额符合条件）
          </label>
        </section>

        {/* 预缴税款计算主表 */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700">预缴税款计算</h2>
            <button
              onClick={pullDeduction}
              type="button"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
            >
              带入加计扣除 ¥{fmt(deductionTotal)}
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {inputRows.map((row) => (
              <div key={row.no} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">{row.no}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-slate-700">{row.label}</span>
                  {row.hint && <span className="block text-xs text-violet-600">{row.hint}</span>}
                </div>
                <div className="relative w-40 shrink-0">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={form[row.key] === 0 ? "" : (form[row.key] as number)}
                    placeholder="0.00"
                    onChange={(e) => setField(row.key, Number(e.target.value) || 0)}
                    aria-label={`第${row.no}行 ${row.label}`}
                    className="w-full pl-6 pr-2.5 py-1.5 text-right tabular-nums text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
              </div>
            ))}

            {/* 10 实际利润额（计算） */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/70">
              <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">10</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-800">实际利润额</span>
                <span className="block text-xs text-slate-400">3+4-5-6-7-8-9</span>
              </div>
              <span className="w-40 shrink-0 text-right pr-2.5 text-sm font-semibold text-slate-800 tabular-nums">
                ¥{fmt(calc.taxableProfit)}
              </span>
            </div>

            {/* 11 税率（固定） */}
            <div className="flex items-center gap-3 px-5 py-2.5">
              <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">11</span>
              <span className="min-w-0 flex-1 text-sm text-slate-700">税率</span>
              <span className="w-40 shrink-0 text-right pr-2.5 text-sm font-medium text-slate-700 tabular-nums">25%</span>
            </div>

            {/* 12 应纳所得税额（计算） */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/70">
              <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">12</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-800">应纳所得税额</span>
                <span className="block text-xs text-slate-400">10×11（实际利润额为负时计 0）</span>
              </div>
              <span className="w-40 shrink-0 text-right pr-2.5 text-sm font-semibold text-slate-800 tabular-nums">
                ¥{fmt(calc.taxPayable)}
              </span>
            </div>

            {/* 13 减免所得税额（输入 + 小型微利测算） */}
            <div className="flex items-center gap-3 px-5 py-2.5">
              <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">13</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm text-slate-700">减：减免所得税额</span>
                {form.smallMicro && smallMicroRelief > 0 && (
                  <button
                    onClick={applySmallMicroRelief}
                    type="button"
                    className="block text-xs text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                  >
                    按小型微利测算减免 ¥{fmt(smallMicroRelief)}（实际税负5%）
                  </button>
                )}
              </div>
              <div className="relative w-40 shrink-0">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.taxRelief === 0 ? "" : form.taxRelief}
                  placeholder="0.00"
                  onChange={(e) => setField("taxRelief", Number(e.target.value) || 0)}
                  aria-label="第13行 减免所得税额"
                  className="w-full pl-6 pr-2.5 py-1.5 text-right tabular-nums text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>
            </div>

            {/* 14 / 15 输入 */}
            {([
              { no: "14", label: "减：本年实际已缴纳所得税额", key: "prepaid" as const },
              { no: "15", label: "减：特定业务预缴（征）所得税额", key: "specialPrepaid" as const },
            ]).map((row) => (
              <div key={row.no} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">{row.no}</span>
                <span className="min-w-0 flex-1 text-sm text-slate-700">{row.label}</span>
                <div className="relative w-40 shrink-0">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={form[row.key] === 0 ? "" : form[row.key]}
                    placeholder="0.00"
                    onChange={(e) => setField(row.key, Number(e.target.value) || 0)}
                    aria-label={`第${row.no}行 ${row.label}`}
                    className="w-full pl-6 pr-2.5 py-1.5 text-right tabular-nums text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
              </div>
            ))}

            {/* 16 本期应补（退）所得税额（计算） */}
            <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50/60 border-t border-emerald-100">
              <span className="w-7 shrink-0 text-center text-xs font-mono text-emerald-500 tabular-nums">16</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-emerald-800">本期应补（退）所得税额</span>
                <span className="block text-xs text-emerald-600">12-13-14-15{!taxDuePositive && "（负数为应退税额）"}</span>
              </div>
              <span className="w-40 shrink-0 text-right pr-2.5 text-base font-bold text-emerald-700 tabular-nums">
                ¥{fmt(calc.taxDue)}
              </span>
            </div>
          </div>
        </section>

        {/* 提交 */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 mb-8">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-700 mb-1">准备提交申报</h3>
            <p className="text-xs text-slate-500">
              所属期 {period}，实际利润额 ¥{fmt(calc.taxableProfit)}，本期应补（退）
              <span className={`font-bold ${taxDuePositive ? "text-emerald-600" : "text-amber-600"}`}> ¥{fmt(calc.taxDue)}</span>
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            type="button"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            提交预缴申报
          </button>
        </div>

        {/* 申报记录 */}
        {declarations.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">申报记录</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs">
                    <th className="text-left py-3 px-4">申报编号</th>
                    <th className="text-left py-3 px-4">所属期</th>
                    <th className="text-right py-3 px-4">实际利润额</th>
                    <th className="text-right py-3 px-4">应纳所得税额</th>
                    <th className="text-right py-3 px-4">减免</th>
                    <th className="text-right py-3 px-4">本期应补（退）</th>
                    <th className="text-center py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((dec) => {
                    const taxableProfit = dec.prepay?.taxableProfit ?? dec.totalInputTax;
                    const taxPayable = dec.prepay?.taxPayable ?? dec.totalInputTax;
                    const relief = dec.prepay?.taxRelief ?? dec.totalDeduction;
                    return (
                      <tr key={dec.id} className="border-t border-slate-100">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{dec.id}</td>
                        <td className="py-3 px-4 text-slate-700">{dec.period}</td>
                        <td className="text-right py-3 px-4 text-slate-700 tabular-nums">¥{fmt(taxableProfit)}</td>
                        <td className="text-right py-3 px-4 text-slate-700 tabular-nums">¥{fmt(taxPayable)}</td>
                        <td className="text-right py-3 px-4 text-violet-600 tabular-nums">¥{fmt(relief)}</td>
                        <td className="text-right py-3 px-4 text-emerald-600 font-medium tabular-nums">¥{fmt(dec.netTax)}</td>
                        <td className="text-center py-3 px-4">
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">已提交</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 确认弹窗 */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">确认提交预缴申报？</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">税款所属期间</span>
                  <span className="font-medium text-slate-700">{period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">实际利润额（第10行）</span>
                  <span className="font-medium text-slate-700 tabular-nums">¥{fmt(calc.taxableProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">应纳所得税额（第12行）</span>
                  <span className="font-medium text-slate-700 tabular-nums">¥{fmt(calc.taxPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">减免所得税额（第13行）</span>
                  <span className="font-medium text-violet-600 tabular-nums">¥{fmt(form.taxRelief)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-medium text-slate-700">本期应补（退）所得税额</span>
                  <span className="font-bold text-emerald-600 tabular-nums">¥{fmt(calc.taxDue)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  type="button"
                  className="flex-1 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeclare}
                  type="button"
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
