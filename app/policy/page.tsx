"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import Layout from "@/app/components/Layout";

interface ChatMessage {
  id: string;
  role: "guide" | "student";
  content: string;
  timestamp: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: "g1",
    role: "guide",
    content: "你好！我是你的巡回指导老师。在3D智慧财税仿真平台中，我将指导你完成票据识别、税额计算和加计抵减申报的全流程。有任何问题随时问我！",
    timestamp: "2024-05-21 09:00",
  },
  {
    id: "g2",
    role: "guide",
    content: "今天的学习任务是：通过平台完成3张绿色采购票据的识别，并生成《绿色采购抵扣申报报告》。你可以按照左侧导航依次完成各个步骤。",
    timestamp: "2024-05-21 09:01",
  },
];

function PolicyContent() {
  const { isLoggedIn, hydrated, policies, readPolicy } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "policy";
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push("/");
  }, [hydrated, isLoggedIn, router]);

  const policy = policies.find((p) => p.id === selectedPolicy);
  const categories = Array.from(new Set(policies.map((p) => p.category)));

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const studentMsg = {
      id: `msg-${Date.now()}`,
      role: "student" as const,
      content: inputText,
      timestamp: new Date().toLocaleString("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).replace(/\//g, "-"),
    };

    setMessages((prev) => [...prev, studentMsg]);
    setInputText("");

    setTimeout(() => {
      const replies = [
        "很好的问题！让我为你详细解答。在进行票据识别时，系统会自动验证发票的真伪，包括发票代码、号码、开票日期等关键字段的校验。",
        "关于加计抵减的计算，生产性服务业适用5%的加计抵减率，生活性服务业适用10%。绿色采购作为重点支持领域，可享受15%的加计抵减优惠。",
        "你可以先进入「票据识别」模块上传票据图片，系统会自动提取发票信息。完成后进入「税额计算」模块查看自动计算的结果。",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: "guide" as const,
        content: reply,
        timestamp: new Date().toLocaleString("zh-CN", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        }).replace(/\//g, "-"),
      }]);
    }, 800);
  };

  const setTab = (tab: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab) params.set("tab", tab);
    else params.delete("tab");
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!isLoggedIn) return null;

  return (
    <Layout>
      <div className="p-6 w-full">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">政策透视 · 巡回指导</h1>
          <p className="text-sm text-slate-500">查阅最新财税政策，在线咨询指导老师</p>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setTab(null)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "policy"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            政策文件
          </button>
          <button
            onClick={() => setTab("guide")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "guide"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            巡回指导
          </button>
        </div>

        {activeTab === "policy" ? (
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-2 space-y-2">
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full cursor-pointer">全部</span>
                {categories.map((cat) => (
                  <span key={cat} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-slate-200 transition-colors">
                    {cat}
                  </span>
                ))}
              </div>

              {policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPolicy(p.id);
                    readPolicy(p.id);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedPolicy === p.id
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      p.isRead ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
                    }`}>
                      {p.category}
                    </span>
                    {!p.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-slate-800 mb-1 line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-slate-500">{p.publishDate}</p>
                </button>
              ))}
            </div>

            <div className="col-span-3">
              {policy ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                      {policy.category}
                    </span>
                    <span className="text-xs text-slate-400">{policy.publishDate}</span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-800 mb-3">{policy.title}</h2>

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">摘要</h4>
                    <p className="text-sm text-slate-700">{policy.summary}</p>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">正文内容</h4>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {policy.content}
                    </div>
                  </div>

                  {policy.files && policy.files.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">表单下载</h4>
                      <div className="flex flex-wrap gap-2">
                        {policy.files.map((f) => (
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
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">选择左侧政策文件查看详情</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" style={{ height: "520px" }}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                师
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">巡回指导老师</h3>
                <p className="text-xs text-slate-500">在线 · 随时为你解答疑问</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                在线
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] ${msg.role === "student" ? "order-2" : ""}`}>
                    <div className={`flex items-center gap-2 mb-1 ${msg.role === "student" ? "justify-end" : ""}`}>
                      {msg.role === "guide" && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                          师
                        </div>
                      )}
                      <span className="text-xs text-slate-400">{msg.timestamp}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "student"
                          ? "bg-emerald-600 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-700 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="输入问题，向指导老师咨询..."
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<div className="p-6">加载中...</div>}>
      <PolicyContent />
    </Suspense>
  );
}
