"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

const steps = [
  { num: 1, label: "票据识别", desc: "上传票据，AI自动识别", path: "/invoice", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "from-blue-500 to-blue-600" },
  { num: 2, label: "税额计算", desc: "自动计算应纳税额", path: "/tax-calc", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "from-emerald-500 to-emerald-600" },
  { num: 3, label: "加计抵减", desc: "填写加计抵减申报", path: "/deduction", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "from-violet-500 to-violet-600" },
  { num: 4, label: "智能申报", desc: "提交税务申报", path: "/declaration", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: "from-amber-500 to-amber-600" },
  { num: 5, label: "生成报告", desc: "查看申报报告", path: "/report", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "from-rose-500 to-rose-600" },
];

const quickLinks = [
  { label: "政策透视", path: "/policy", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", desc: "查阅最新财税政策" },
  { label: "巡回指导", path: "/policy?tab=guide", icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", desc: "在线咨询指导老师" },
];

export default function DashboardPage() {
  const { isLoggedIn, studentName, invoices, declarations } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  const recognizedCount = invoices.filter((i) => i.status !== "pending").length;
  const declaredCount = declarations.filter((d) => d.status === "submitted").length;
  const totalTax = invoices.reduce((sum, i) => sum + i.taxAmount, 0);

  const stats = [
    { label: "已识别票据", value: recognizedCount, suffix: "张", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "已提交申报", value: declaredCount, suffix: "次", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "累计税额", value: totalTax.toFixed(2), suffix: "元", color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            欢迎你，{studentName}同学
          </h1>
          <p className="text-slate-500 text-sm">
            3D智慧财税仿真平台 · 按照以下步骤完成智能申报流程
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>
                {s.value}<span className="text-sm font-normal ml-1">{s.suffix}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            <h2 className="text-lg font-bold text-slate-800">申报流程</h2>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />

            <div className="grid grid-cols-5 gap-3 relative z-10">
              {steps.map((step, idx) => {
                const isDone = idx < 2 || (idx === 2 && recognizedCount > 0) || (idx === 3 && declaredCount > 0);
                return (
                  <Link
                    key={step.num}
                    href={step.path}
                    className="group"
                  >
                    <div className={`relative rounded-xl border-2 p-4 text-center transition-all hover:shadow-lg ${
                      isDone
                        ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}>
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} text-white shadow-md mb-3 group-hover:scale-110 transition-transform`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                        </svg>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 mb-0.5">{step.label}</h3>
                      <p className="text-xs text-slate-500">{step.desc}</p>

                      {isDone && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        进入 →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-rose-500 rounded-full" />
            <h2 className="text-lg font-bold text-slate-800">政策透视 · 巡回指导</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.path}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-rose-300 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-rose-600 transition-colors">{link.label}</h3>
                  <p className="text-xs text-slate-500">{link.desc}</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 ml-auto group-hover:text-rose-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
