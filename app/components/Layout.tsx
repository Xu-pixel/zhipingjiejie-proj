"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "工作台", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { path: "/invoice", label: "票据识别", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { path: "/tax-calc", label: "税额计算", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { path: "/deduction", label: "加计抵减", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { path: "/declaration", label: "智能申报", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { path: "/report", label: "申报报告", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { path: "/policy", label: "政策透视", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
];

function SidebarIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { studentName, logout, invoices, declarations } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const recognizedCount = invoices.filter((i) => i.status !== "pending").length;
  const declaredCount = declarations.filter((d) => d.status === "submitted").length;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-emerald-700 text-white transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-emerald-600">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold truncate">智慧财税平台</h1>
            </div>
          )}
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-emerald-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
                {studentName ? studentName.charAt(0) : "学"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{studentName || "学生用户"}</p>
                <p className="text-xs text-emerald-300 truncate">在线学习中</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-100 hover:bg-emerald-600/50 hover:text-white"
                }`}
              >
                <SidebarIcon d={item.icon} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Stats */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-emerald-600 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300">已识别票据</span>
              <span className="font-bold bg-emerald-600 px-2 py-0.5 rounded-full">{recognizedCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300">已申报</span>
              <span className="font-bold bg-emerald-600 px-2 py-0.5 rounded-full">{declaredCount}</span>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-2.5 border-t border-emerald-600 text-emerald-300 hover:text-white hover:bg-emerald-600/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-300 hover:text-white hover:bg-emerald-600/50 transition-colors border-t border-emerald-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>退出登录</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
