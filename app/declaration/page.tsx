"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, type PrepayReturn } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

const RATE = 0.25;
const SMALL_MICRO_CEILING = 3_000_000; // 实际利润额 ≤ 300万 适用小型微利测算
const SMALL_MICRO_EFFECTIVE = 0.05; // 小型微利企业实际税负 5%

// 纳税人信息（演示主体）
const TAXPAYER_NAME = "汇成针织有限公司";
const TAXPAYER_ID = "91350503MA9TNBHYXC";

// 演示预置数：利润总额 = 营业收入 - 营业成本 - 销售费用 - 管理费用 - 财务费用 = 6,000,000
const PRESET_REVENUE = 20_000_000;
const PRESET_COST = 9_000_000;
const PRESET_SELLING = 1_200_000;
const PRESET_ADMIN = 3_500_000; // 含研发费用 2,760,000
const PRESET_FINANCE = 300_000;

// 评分标准答案（按角色区分）
const STANDARD_ANSWER_TEACHER = 200_000; // 教师演示正确答案
const STANDARD_ANSWER_STUDENT = 492_000; // 学生实操正确答案（49.2万元：62万应纳 - 12.8万设备抵免）
const SCORE_TOLERANCE = 0.5; // 与标准答案的允许误差（元）

// 第7行加计扣除、第13行减免的演示预置（按角色），使中间计算与标准答案自洽
// 学生：利润总额600万 - 加计扣除352万 = 248万(第10行) × 25% = 62万(第12行) - 设备抵免12.8万 = 49.2万
const STUDENT_DEDUCTION = 3_520_000; // 第7行加计扣除（使实际利润额为248万）
const STUDENT_RELIEF = 128_000; // 节能设备抵免 128万×10%
// 教师：利润总额600万 - 研发加计500万 = 100万 × 25% = 25万 - 设备抵免5万 = 20万
const TEACHER_DEDUCTION = 5_000_000;
const TEACHER_RELIEF = 50_000; // 节能设备抵免 50万×10%

const officialFiles = [
  { label: "填报说明（.doc）", href: "/forms/qysds-prepay-A-2020-instructions.doc", download: "企业所得税月（季）度预缴纳税申报表（A类）填报说明.doc" },
  { label: "空白表模板（.xlsx）", href: "/forms/qysds-prepay-A-blank.xlsx", download: "企业所得税月（季）度预缴纳税申报表（A类）空白表.xlsx" },
];

interface FormState {
  revenue: number;
  cost: number;
  sellingExpense: number;
  adminExpense: number;
  financeExpense: number;
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
  sellingExpense: 0,
  adminExpense: 0,
  financeExpense: 0,
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
  const { isLoggedIn, hydrated, studentName, role, invoices, deductions, declarations, addDeclaration } = useApp();
  const router = useRouter();
  const [period, setPeriod] = useState("2026-06");
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm,
    revenue: PRESET_REVENUE,
    cost: PRESET_COST,
    sellingExpense: PRESET_SELLING,
    adminExpense: PRESET_ADMIN,
    financeExpense: PRESET_FINANCE,
    taxFreeAndExtra: STUDENT_DEDUCTION,
    taxRelief: STUDENT_RELIEF,
  }));
  const [showConfirm, setShowConfirm] = useState(false);
  const presetAppliedRef = useRef(false);

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push("/");
  }, [hydrated, isLoggedIn, router]);

  // 教师登录时把第7行/第13行切换为教师演示预置（仅首次，之后不覆盖手工修改）
  useEffect(() => {
    if (!hydrated || presetAppliedRef.current) return;
    presetAppliedRef.current = true;
    if (role === "teacher") {
      setForm((f) => ({ ...f, taxFreeAndExtra: TEACHER_DEDUCTION, taxRelief: TEACHER_RELIEF }));
    }
  }, [hydrated, role]);

  const recognizedInvoices = invoices.filter((i) => i.status === "calculated" || i.status === "declared");
  const submittedDeductions = deductions.filter((d) => d.status === "submitted");
  const deductionTotal = round2(submittedDeductions.reduce((s, d) => s + d.deductionAmount, 0));

  // 计算行：3 利润总额、10 实际利润额、12 应纳所得税额、16 本期应补（退）所得税额
  const calc = useMemo(() => {
    const profit = round2(
      form.revenue - form.cost - form.sellingExpense - form.adminExpense - form.financeExpense,
    );
    const taxableProfit = round2(
      profit +
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
    return { profit, taxableProfit, taxBase, taxPayable, taxDue };
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
      profit: calc.profit,
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

  // 预缴税款计算行配置
  type RowCfg = { no?: string; label: string; key: keyof FormState; hint?: string; hintClass?: string };

  const rowsBeforeProfit: RowCfg[] = [
    { no: "1", label: "营业收入", key: "revenue" },
    { no: "2", label: "营业成本", key: "cost" },
  ];
  const expenseRows: RowCfg[] = [
    { label: "减：销售费用", key: "sellingExpense" },
    {
      label: "减：管理费用",
      key: "adminExpense",
      hint: "含研发费用，在第7行享受加计扣除",
      hintClass: "text-slate-400",
    },
    { label: "减：财务费用", key: "financeExpense" },
  ];
  const rowsAfterProfit: RowCfg[] = [
    { no: "4", label: "加：特定业务计算的应纳税所得额", key: "specialTaxable" },
    { no: "5", label: "减：不征税收入", key: "nonTaxIncome" },
    { no: "6", label: "减：资产加速折旧、摊销（扣除）调减额", key: "accelDepr" },
    { no: "7", label: "减：免税收入、减计收入、加计扣除", key: "taxFreeAndExtra", hint: "已提交加计扣除自动带入，可手工调整", hintClass: "text-violet-600" },
    { no: "8", label: "减：所得减免", key: "incomeReduction" },
    { no: "9", label: "减：弥补以前年度亏损", key: "lossOffset" },
  ];

  const renderInputRow = (row: RowCfg) => (
    <div key={String(row.key)} className="flex items-center gap-3 px-5 py-2.5">
      <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">{row.no ?? ""}</span>
      <div className="min-w-0 flex-1">
        <span className="text-sm text-slate-700">{row.label}</span>
        {row.hint && <span className={`block text-xs ${row.hintClass ?? "text-violet-600"}`}>{row.hint}</span>}
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
          aria-label={row.no ? `第${row.no}行 ${row.label}` : row.label}
          className="w-full pl-6 pr-2.5 py-1.5 text-right tabular-nums text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
        />
      </div>
    </div>
  );

  const taxDuePositive = calc.taxDue >= 0;

  // 申报评分：标准答案按角色区分（教师演示 / 学生实操 票据不同）
  const STANDARD_ANSWER = role === "teacher" ? STANDARD_ANSWER_TEACHER : STANDARD_ANSWER_STUDENT;
  const latestDeclaration = declarations.length > 0 ? declarations[declarations.length - 1] : null;
  const submittedTax = latestDeclaration ? latestDeclaration.netTax : 0;
  const isCorrect = latestDeclaration != null && Math.abs(submittedTax - STANDARD_ANSWER) <= SCORE_TOLERANCE;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700 truncate">{TAXPAYER_NAME}</p>
              <p className="mt-1 px-1 text-xs text-slate-400 font-mono truncate">{TAXPAYER_ID}</p>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">预缴方式</span>
              <p className="px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700">按照实际利润额预缴</p>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">经办人</span>
              <p className="px-3 py-2 rounded-lg bg-slate-50 text-sm text-slate-700 truncate">{studentName || "学生用户"}</p>
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
            {rowsBeforeProfit.map(renderInputRow)}
            {expenseRows.map(renderInputRow)}

            {/* 3 利润总额（计算） */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/70">
              <span className="w-7 shrink-0 text-center text-xs font-mono text-slate-400 tabular-nums">3</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-800">利润总额</span>
                <span className="block text-xs text-slate-400">营业收入-营业成本-销售费用-管理费用-财务费用</span>
              </div>
              <span className="w-40 shrink-0 text-right pr-2.5 text-sm font-semibold text-slate-800 tabular-nums">
                ¥{fmt(calc.profit)}
              </span>
            </div>

            {rowsAfterProfit.map(renderInputRow)}

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

        {/* 申报评分 */}
        {latestDeclaration && (
          <section
            aria-live="polite"
            className={`mb-8 rounded-xl border p-5 ${
              isCorrect ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full text-white ${
                  isCorrect ? "bg-emerald-600" : "bg-amber-500"
                }`}
              >
                <span className="text-lg font-bold leading-none tabular-nums">{isCorrect ? 100 : 0}</span>
                <span className="text-[10px] leading-none mt-0.5">分</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-sm font-bold ${isCorrect ? "text-emerald-800" : "text-amber-800"}`}>
                  {isCorrect ? "申报正确，得分 100" : "申报结果与标准答案不一致"}
                </h2>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">你的申报（本期应纳企业所得税）</span>
                    <span className="font-medium text-slate-800 tabular-nums">¥{fmt(submittedTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">标准答案</span>
                    <span className="font-medium text-slate-800 tabular-nums">¥{fmt(STANDARD_ANSWER)}</span>
                  </div>
                </div>
                {!isCorrect && (
                  <p className="mt-2 text-xs text-amber-700 leading-relaxed">
                    与标准答案相差 ¥{fmt(Math.abs(submittedTax - STANDARD_ANSWER))}。请检查第7行加计扣除、第13行减免所得税额等是否填报正确，调整后可再次提交。
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

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
