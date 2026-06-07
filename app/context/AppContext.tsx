"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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

export interface Declaration {
  id: string;
  period: string;
  invoiceCount: number;
  totalInputTax: number;
  totalDeduction: number;
  netTax: number;
  status: "draft" | "submitted" | "approved";
  submitDate?: string;
}

export interface PolicyDoc {
  id: string;
  title: string;
  category: string;
  publishDate: string;
  summary: string;
  content: string;
  isRead: boolean;
}

export interface GuideMessage {
  id: string;
  role: "student" | "guide";
  content: string;
  timestamp: string;
}

interface AppState {
  isLoggedIn: boolean;
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
];

const initialInvoices: Invoice[] = [
  {
    id: "demo-001",
    type: "增值税专用发票",
    number: "4400123456",
    date: "2024-05-10",
    seller: "深圳华为技术有限公司",
    buyer: "广东智慧科技有限公司",
    amount: 88495.58,
    taxRate: 0.13,
    taxAmount: 11504.42,
    totalAmount: 100000,
    status: "recognized",
    items: [
      { name: "服务器主机", quantity: 2, unitPrice: 35398.23, amount: 70796.46, taxRate: 0.13, taxAmount: 9203.54 },
      { name: "网络交换机", quantity: 1, unitPrice: 17699.12, amount: 17699.12, taxRate: 0.13, taxAmount: 2300.88 },
    ],
  },
  {
    id: "demo-002",
    type: "增值税普通发票",
    number: "4400987654",
    date: "2024-05-15",
    seller: "广州白云办公设备有限公司",
    buyer: "广东智慧科技有限公司",
    amount: 2654.87,
    taxRate: 0.13,
    taxAmount: 345.13,
    totalAmount: 3000,
    status: "recognized",
    items: [
      { name: "办公桌椅", quantity: 5, unitPrice: 530.97, amount: 2654.87, taxRate: 0.13, taxAmount: 345.13 },
    ],
  },
  {
    id: "demo-003",
    type: "电子发票",
    number: "EL20240518001",
    date: "2024-05-18",
    seller: "杭州阿里云科技有限公司",
    buyer: "广东智慧科技有限公司",
    amount: 4716.98,
    taxRate: 0.06,
    taxAmount: 283.02,
    totalAmount: 5000,
    status: "calculated",
    items: [
      { name: "云服务器租赁服务", quantity: 12, unitPrice: 393.08, amount: 4716.98, taxRate: 0.06, taxAmount: 283.02 },
    ],
  },
  {
    id: "demo-004",
    type: "增值税专用发票",
    number: "4400332211",
    date: "2024-05-22",
    seller: "北京用友网络科技股份有限公司",
    buyer: "广东智慧科技有限公司",
    amount: 16814.16,
    taxRate: 0.13,
    taxAmount: 2185.84,
    totalAmount: 19000,
    status: "recognized",
    items: [
      { name: "财务软件许可", quantity: 1, unitPrice: 8849.56, amount: 8849.56, taxRate: 0.13, taxAmount: 1150.44 },
      { name: "实施服务费", quantity: 1, unitPrice: 7964.60, amount: 7964.60, taxRate: 0.13, taxAmount: 1035.40 },
    ],
  },
];

const initialGuideMessages: GuideMessage[] = [
  {
    id: "g1",
    role: "guide",
    content: "你好！我是你的巡回指导老师。在3D智慧财税仿真平台中，我将指导你完成票据识别、税额计算和加计抵减申报的全流程。有任何问题随时问我！",
    timestamp: "2024-05-21 09:00",
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [currentStep, setCurrentStepState] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [policies, setPolicies] = useState<PolicyDoc[]>(initialPolicies);
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>(initialGuideMessages);

  const login = useCallback((name: string, id: string) => {
    setStudentName(name);
    setStudentId(id);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setStudentName("");
    setStudentId("");
    setCurrentStepState(0);
    setInvoices(initialInvoices);
    setDeductions([]);
    setDeclarations([]);
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(step);
  }, []);

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice]);
  }, []);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv))
    );
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
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
