import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "./context/AppContext";

export const metadata: Metadata = {
  title: "3D智慧财税仿真平台",
  description: "人工智能应用 · 实践教学",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
