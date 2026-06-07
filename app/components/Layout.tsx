"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import { memo, useCallback, useMemo, useState } from "react";

type SidebarItem = {
  path: string;
  label: string;
  icon: string;
  accentBg: string;
  accentText: string;
};

const navItems: readonly SidebarItem[] = [
  {
    path: "/dashboard",
    label: "工作台",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    accentBg: "bg-blue-300/15",
    accentText: "text-blue-100",
  },
  {
    path: "/invoice",
    label: "票据识别",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    accentBg: "bg-sky-300/15",
    accentText: "text-sky-100",
  },
  {
    path: "/tax-calc",
    label: "税额计算",
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    accentBg: "bg-violet-300/15",
    accentText: "text-violet-100",
  },
  {
    path: "/declaration",
    label: "智能申报",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    accentBg: "bg-amber-300/15",
    accentText: "text-amber-100",
  },
  {
    path: "/report",
    label: "申报报告",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    accentBg: "bg-emerald-300/15",
    accentText: "text-emerald-100",
  },
  {
    path: "/policy",
    label: "政策透视",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    accentBg: "bg-rose-300/15",
    accentText: "text-rose-100",
  },
];

const SidebarIcon = memo(function SidebarIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
});

function isActivePath(pathname: string, targetPath: string) {
  if (pathname === targetPath) return true;
  return pathname.startsWith(`${targetPath}/`);
}

const SidebarNavItem = memo(function SidebarNavItem({
  item,
  isActive,
  collapsed,
}: {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.path}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={`group relative flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/55 focus-visible:ring-inset ${
        isActive
          ? "bg-emerald-600/90 text-emerald-50"
          : "text-emerald-100/90 hover:bg-emerald-600/28 hover:text-emerald-50 active:bg-emerald-600/35"
      }`}
    >
      <span
        className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-md ${
          isActive ? "bg-emerald-500/35 text-emerald-50" : `${item.accentBg} ${item.accentText}`
        }`}
      >
        <SidebarIcon d={item.icon} />
      </span>
      <span
        className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-300/75 transition-colors group-hover:text-emerald-50/90"
        aria-hidden="true"
      >
        {isActive ? "•" : "▸"}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const { studentName, logout, invoices, declarations } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const { recognizedCount, declaredCount } = useMemo(() => {
    let recognized = 0;
    let declared = 0;

    for (const invoice of invoices) {
      if (invoice.status !== "pending") {
        recognized += 1;
      }
    }

    for (const declaration of declarations) {
      if (declaration.status === "submitted") {
        declared += 1;
      }
    }

    return { recognizedCount: recognized, declaredCount: declared };
  }, [invoices, declarations]);

  const userInitial = useMemo(() => (studentName ? studentName.charAt(0) : "学"), [studentName]);
  const displayStudent = studentName || "学生用户";

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col bg-emerald-700 text-white transition-[width] duration-200 ${collapsed ? "w-16" : "w-56"}`}
        aria-label="主导航"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-emerald-800/70 ring-1 ring-emerald-400/20">
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
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-bold">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{displayStudent}</p>
                <p className="text-xs text-emerald-300 truncate">在线学习中</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav id="sidebar-nav" className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            return <SidebarNavItem key={item.path} item={item} isActive={isActivePath(pathname, item.path)} collapsed={collapsed} />;
          })}
        </nav>

        {/* Stats */}
        {!collapsed && (
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300">已识别票据</span>
              <span className="rounded-full border border-emerald-300/30 bg-transparent px-2 py-0.5 text-xs font-medium text-emerald-100">
                {recognizedCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300">已申报</span>
              <span className="rounded-full border border-emerald-300/30 bg-transparent px-2 py-0.5 text-xs font-medium text-emerald-100">
                {declaredCount}
              </span>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapsed}
          type="button"
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          className="flex h-11 w-full items-center justify-center text-emerald-300 transition-[background-color,color] duration-150 hover:bg-emerald-600/30 hover:text-white active:bg-emerald-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/55 focus-visible:ring-inset"
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
          type="button"
          aria-label="退出登录"
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-300 hover:text-white hover:bg-emerald-600/30 active:bg-emerald-600/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/55 focus-visible:ring-inset"
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
