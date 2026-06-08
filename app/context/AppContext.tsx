"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { getAllInvoices, saveInvoiceToDb, deleteInvoiceFromDb, clearAllInvoices } from "@/app/services/cacheDb";

export interface Invoice {
  id: string;
  type: string;
  number: string;
  date: string;
  seller: string;
  buyer: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: "pending" | "recognized" | "calculated" | "declared";
  items: InvoiceItem[];
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

export interface DeductionItem {
  id: string;
  period: string;
  inputTax: number;
  deductionRate: number;
  deductionAmount: number;
  category: string;
  description: string;
  status: "draft" | "submitted";
}

/**
 * 企业所得税月（季）度预缴纳税申报表（A类）主表「预缴税款计算」行次
 * 行号对应官方表样，computed 行（10/12/16）由输入行推导
 */
export interface PrepayReturn {
  revenue: number;          // 1 营业收入
  cost: number;             // 2 营业成本
  profit: number;           // 3 利润总额
  specialTaxable: number;   // 4 加：特定业务计算的应纳税所得额
  nonTaxIncome: number;     // 5 减：不征税收入
  accelDepr: number;        // 6 减：资产加速折旧、摊销（扣除）调减额
  taxFreeAndExtra: number;  // 7 减：免税收入、减计收入、加计扣除
  incomeReduction: number;  // 8 减：所得减免
  lossOffset: number;       // 9 减：弥补以前年度亏损
  taxableProfit: number;    // 10 实际利润额 = 3+4-5-6-7-8-9
  rate: number;             // 11 税率（0.25）
  taxPayable: number;       // 12 应纳所得税额 = 10×11
  taxRelief: number;        // 13 减：减免所得税额
  prepaid: number;          // 14 减：本年实际已缴纳所得税额
  specialPrepaid: number;   // 15 减：特定业务预缴（征）所得税额
  taxDue: number;           // 16 本期应补（退）所得税额 = 12-13-14-15
  smallMicro: boolean;      // 小型微利企业
}

export interface Declaration {
  id: string;
  period: string;
  invoiceCount: number;
  totalInputTax: number;
  totalDeduction: number;
  netTax: number;
  status: "draft" | "submitted" | "approved";
  submitDate?: string;
  prepay?: PrepayReturn;
}

export interface PolicyFile {
  label: string;
  href: string;
  download: string;
}

export interface PolicyDoc {
  id: string;
  title: string;
  category: string;
  publishDate: string;
  summary: string;
  content: string;
  isRead: boolean;
  files?: PolicyFile[];
}

export interface GuideMessage {
  id: string;
  role: "student" | "guide";
  content: string;
  timestamp: string;
}

interface AppState {
  isLoggedIn: boolean;
  hydrated: boolean;
  studentName: string;
  studentId: string;
  currentStep: number;
  invoices: Invoice[];
  deductions: DeductionItem[];
  declarations: Declaration[];
  policies: PolicyDoc[];
  guideMessages: GuideMessage[];
  login: (name: string, id: string) => void;
  logout: () => void;
  setCurrentStep: (step: number) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addDeduction: (deduction: DeductionItem) => void;
  updateDeduction: (id: string, updates: Partial<DeductionItem>) => void;
  addDeclaration: (declaration: Declaration) => void;
  readPolicy: (id: string) => void;
  addGuideMessage: (message: GuideMessage) => void;
}

const AppContext = createContext<AppState | null>(null);

const initialPolicies: PolicyDoc[] = [
  {
    id: "p1",
    title: "关于深化增值税改革有关政策的公告",
    category: "加计抵减",
    publishDate: "2024-01-15",
    summary: "明确生产、生活性服务业增值税加计抵减政策",
    content: "一、自2024年1月1日至2024年12月31日，允许生产性服务业纳税人按照当期可抵扣进项税额加计5%抵减应纳税额...\n\n二、自2024年1月1日至2024年12月31日，允许生活性服务业纳税人按照当期可抵扣进项税额加计10%抵减应纳税额...",
    isRead: false,
  },
  {
    id: "p2",
    title: "绿色采购税收优惠政策指引",
    category: "绿色采购",
    publishDate: "2024-02-20",
    summary: "节能环保产品采购可享受增值税即征即退优惠",
    content: "为鼓励绿色采购，对采购节能环保产品、环境标志产品的企业，给予以下税收优惠：\n\n1. 增值税即征即退50%\n2. 企业所得税减按90%计入收入\n3. 允许加计抵扣进项税额",
    isRead: false,
  },
  {
    id: "p3",
    title: "增值税发票管理办法（2024修订）",
    category: "发票管理",
    publishDate: "2024-03-01",
    summary: "规范增值税发票开具、使用和管理",
    content: "第一章 总则\n第一条 为了加强增值税发票管理，保障国家税收收入，根据《中华人民共和国税收征收管理法》及其实施细则...",
    isRead: false,
  },
  {
    id: "p4",
    title: "智慧税务建设三年规划",
    category: "智慧税务",
    publishDate: "2024-04-10",
    summary: "推进3D仿真、AI识别等技术在税务教学中的应用",
    content: "一、建设目标\n到2026年底，基本建成以3D仿真平台为支撑、AI智能识别为辅助、巡回指导为保障的智慧税务教学体系...",
    isRead: false,
  },
  {
    id: "p5",
    title: "中华人民共和国企业所得税月（季）度预缴纳税申报表（A类，2018年版，2020修订）",
    category: "申报表单",
    publishDate: "2020-06-01",
    summary: "国家税务总局发布的企业所得税预缴申报表（A类）正式表样、填报说明及空白表模板。",
    content:
      "适用范围：实行查账征收企业所得税的居民企业纳税人，在月（季）度预缴纳税申报时填报。\n\n「预缴税款计算」主表行次：\n1　营业收入\n2　营业成本\n3　利润总额\n4　加：特定业务计算的应纳税所得额\n5　减：不征税收入\n6　减：资产加速折旧、摊销（扣除）调减额（A201020）\n7　减：免税收入、减计收入、加计扣除\n8　减：所得减免\n9　减：弥补以前年度亏损\n10  实际利润额（3+4-5-6-7-8-9）\n11  税率（25%）\n12  应纳所得税额（10×11）\n13  减：减免所得税额（含符合条件的小型微利企业减免）\n14  减：本年实际已缴纳所得税额\n15  减：特定业务预缴（征）所得税额\n16  本期应补（退）所得税额（12-13-14-15）\n\n小型微利企业判定：从业人数季度平均值不超过300人、资产总额季度平均值不超过5000万元、非国家限制或禁止行业，且实际利润额不超过300万元。",
    isRead: false,
    files: [
      {
        label: "填报说明（.doc）",
        href: "/forms/qysds-prepay-A-2020-instructions.doc",
        download: "企业所得税月（季）度预缴纳税申报表（A类）填报说明.doc",
      },
      {
        label: "空白表模板（.xlsx）",
        href: "/forms/qysds-prepay-A-blank.xlsx",
        download: "企业所得税月（季）度预缴纳税申报表（A类）空白表.xlsx",
      },
    ],
  },
];

// 初始票据为空：4 张演示发票由用户在「票据识别」页上传，
// 命中后由 services/demoInvoices.ts「假装识别」返回预置数据。
const initialInvoices: Invoice[] = [];

// 演示数据版本：升级后强制重置 IndexedDB 中的旧演示发票
const INVOICE_SEED_VERSION = "qysds-prepay-demo-2026-06-upload";

const initialGuideMessages: GuideMessage[] = [
  {
    id: "g1",
    role: "guide",
    content: "你好！我是你的巡回指导老师。在3D智慧财税仿真平台中，我将指导你完成票据识别、税额计算和加计抵减申报的全流程。有任何问题随时问我！",
    timestamp: "2024-05-21 09:00",
  },
];

function readLoginState() {
  try {
    const raw = localStorage.getItem("login-state");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.name && data?.id) return data as { name: string; id: string };
  } catch { /* ignore */ }
  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  // 初始值与服务端渲染保持一致（未登录），登录态在 mount 后从 localStorage 恢复，
  // 否则会触发 hydration mismatch。
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStepState] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [policies, setPolicies] = useState<PolicyDoc[]>(initialPolicies);
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>(initialGuideMessages);

  const bootRef = useRef(false);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    // 恢复虚拟登录态
    const saved = readLoginState();
    if (saved) {
      setStudentName(saved.name);
      setStudentId(saved.id);
      setIsLoggedIn(true);
    }
    setHydrated(true);

    // 加载已识别票据（IndexedDB）。演示数据版本变化时清空旧票据并写入新演示集。
    (async () => {
      try {
        let seedVersion: string | null = null;
        try { seedVersion = localStorage.getItem("invoice-seed-version"); } catch { /* ignore */ }

        if (seedVersion !== INVOICE_SEED_VERSION) {
          await clearAllInvoices();
          await Promise.all(initialInvoices.map((inv) => saveInvoiceToDb(inv).catch(() => {})));
          setInvoices(initialInvoices);
          try { localStorage.setItem("invoice-seed-version", INVOICE_SEED_VERSION); } catch { /* ignore */ }
          return;
        }

        const dbInvoices = await getAllInvoices<Invoice>();
        if (dbInvoices.length > 0) {
          setInvoices(dbInvoices);
        } else {
          await Promise.all(initialInvoices.map((inv) => saveInvoiceToDb(inv).catch(() => {})));
          setInvoices(initialInvoices);
        }
      } catch {
        setInvoices(initialInvoices);
      }
    })();
  }, []);

  const login = useCallback((name: string, id: string) => {
    setStudentName(name);
    setStudentId(id);
    setIsLoggedIn(true);
    try { localStorage.setItem("login-state", JSON.stringify({ name, id })); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setStudentName("");
    setStudentId("");
    setCurrentStepState(0);
    setInvoices(initialInvoices);
    setDeductions([]);
    setDeclarations([]);
    try { localStorage.removeItem("login-state"); } catch { /* ignore */ }
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(step);
  }, []);

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice]);
    saveInvoiceToDb(invoice).catch(() => {});
  }, []);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
      const updated = next.find((inv) => inv.id === id);
      if (updated) saveInvoiceToDb(updated).catch(() => {});
      return next;
    });
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    deleteInvoiceFromDb(id).catch(() => {});
  }, []);

  const addDeduction = useCallback((deduction: DeductionItem) => {
    setDeductions((prev) => [...prev, deduction]);
  }, []);

  const updateDeduction = useCallback((id: string, updates: Partial<DeductionItem>) => {
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  }, []);

  const addDeclaration = useCallback((declaration: Declaration) => {
    setDeclarations((prev) => [...prev, declaration]);
  }, []);

  const readPolicy = useCallback((id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isRead: true } : p))
    );
  }, []);

  const addGuideMessage = useCallback((message: GuideMessage) => {
    setGuideMessages((prev) => [...prev, message]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        hydrated,
        studentName,
        studentId,
        currentStep,
        invoices,
        deductions,
        declarations,
        policies,
        guideMessages,
        login,
        logout,
        setCurrentStep,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addDeduction,
        updateDeduction,
        addDeclaration,
        readPolicy,
        addGuideMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
