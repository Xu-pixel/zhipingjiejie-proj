"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp, type Declaration, type DeductionItem, type Invoice } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

const steps = [
  { num: 1, label: "票据识别", desc: "上传票据，AI 自动识别", path: "/invoice", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", iconBg: "bg-blue-500" },
  { num: 2, label: "税额计算", desc: "自动计算应纳税额", path: "/tax-calc", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", iconBg: "bg-emerald-500" },
  { num: 3, label: "加计抵减", desc: "填写加计抵减申报", path: "/deduction", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", iconBg: "bg-violet-500" },
  { num: 4, label: "智能申报", desc: "提交税务申报", path: "/declaration", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", iconBg: "bg-amber-500" },
  { num: 5, label: "生成报告", desc: "查看申报报告", path: "/report", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", iconBg: "bg-rose-500" },
] as const;

const quickLinks = [
  { label: "政策透视", path: "/policy", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", desc: "查阅最新财税政策" },
  { label: "巡回指导", path: "/policy?tab=guide", icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", desc: "在线咨询指导老师" },
] as const;

function StepIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function getStepCompletion(invoices: Invoice[], deductions: DeductionItem[], declarations: Declaration[]) {
  const recognized = invoices.filter((i) => i.status !== "pending");
  const allCalculated =
    recognized.length > 0 && recognized.every((i) => i.status === "calculated" || i.status === "declared");
  const hasSubmittedDeduction = deductions.some((d) => d.status === "submitted");
  const hasSubmittedDeclaration = declarations.some((d) => d.status === "submitted");

  const completed = [
    recognized.length > 0,
    allCalculated,
    hasSubmittedDeduction,
    hasSubmittedDeclaration,
    hasSubmittedDeclaration,
  ];

  const currentIndex = completed.findIndex((done) => !done);
  return { completed, currentIndex: currentIndex === -1 ? steps.length : currentIndex };
}

export default function DashboardPage() {
  const { isLoggedIn, hydrated, studentName, invoices, deductions, declarations } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push("/");
  }, [hydrated, isLoggedIn, router]);

  const recognizedCount = invoices.filter((i) => i.status !== "pending").length;
  const declaredCount = declarations.filter((d) => d.status === "submitted").length;
  const totalTax = invoices.reduce((sum, i) => sum + i.taxAmount, 0);

  const { completed: stepCompleted, currentIndex: currentStepIndex } = useMemo(
    () => getStepCompletion(invoices, deductions, declarations),
    [invoices, deductions, declarations],
  );

  const allStepsDone = currentStepIndex >= steps.length;
  const currentStep = !allStepsDone ? steps[currentStepIndex] : null;

  const stats = [
    { label: "已识别票据", value: recognizedCount, suffix: "张" },
    { label: "已提交申报", value: declaredCount, suffix: "次" },
    { label: "累计税额", value: totalTax.toFixed(2), suffix: "元" },
  ];

  if (!hydrated || !isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 w-full max-w-6xl">
        <header className="mb-8">
          <h1 className="text-xl font-bold text-slate-800 mb-1 text-balance">
            欢迎你，<span className="text-emerald-600">{studentName}</span>同学
          </h1>
          <p className="text-sm text-slate-600">
            {allStepsDone ? (
              "申报流程已全部完成，可查看报告或回顾各步骤。"
            ) : (
              <>
                当前进行第 {currentStepIndex + 1} 步：
                <span className="font-medium text-slate-800">{currentStep?.label}</span>
              </>
            )}
          </p>
        </header>

        <section aria-label="学习进度概览" className="mb-8">
          <div className="flex flex-col sm:flex-row rounded-xl border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {stats.map((s) => (
              <div key={s.label} className="flex-1 px-5 py-4 min-w-0">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-base font-semibold text-slate-800 tabular-nums">
                  {s.value}
                  <span className="text-xs font-normal text-slate-400 ml-1">{s.suffix}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8" aria-labelledby="workflow-heading">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h2 id="workflow-heading" className="text-lg font-bold text-slate-800">申报流程</h2>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {stepCompleted.filter(Boolean).length}/{steps.length} 步已完成
            </p>
          </div>

          <div>
            <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 list-none p-0 m-0">
              {steps.map((step, idx) => {
                const isDone = stepCompleted[idx];
                const isCurrent = idx === currentStepIndex && !allStepsDone;
                return (
                  <li key={step.num}>
                    <Link
                      href={step.path}
                      aria-label={`${step.label}：${step.desc}${isCurrent ? "（当前步骤）" : isDone ? "（已完成）" : ""}`}
                      aria-current={isCurrent ? "step" : undefined}
                      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      <div
                        className={`relative h-full rounded-xl border-2 p-4 text-center motion-safe:transition-colors motion-safe:duration-200 ${
                          isDone
                            ? "border-emerald-200 bg-emerald-50/60 group-hover:border-emerald-300"
                            : isCurrent
                              ? "border-emerald-500 bg-white"
                              : "border-slate-200 bg-white group-hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${step.iconBg} text-white mb-3`}
                        >
                          <StepIcon d={step.icon} />
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 mb-0.5">{step.label}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>

                        {isCurrent && (
                          <span className="mt-2 inline-block text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            当前步骤
                          </span>
                        )}

                        {isDone && (
                          <span
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                            aria-hidden
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}

                        <span className="mt-2 block text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-200">
                          进入此步骤
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section aria-labelledby="resources-heading">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 id="resources-heading" className="text-lg font-bold text-slate-800">政策透视 · 巡回指导</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.path}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-rose-300 motion-safe:transition-colors motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <div className="w-11 h-11 shrink-0 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 motion-safe:transition-colors motion-safe:duration-200">
                  <StepIcon d={link.icon} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">{link.label}</h3>
                  <p className="text-xs text-slate-500">{link.desc}</p>
                </div>
                <svg
                  className="w-5 h-5 shrink-0 text-slate-300 ml-auto group-hover:text-rose-500 motion-safe:transition-colors motion-safe:duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
