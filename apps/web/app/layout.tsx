import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智能晚辅托管系统",
  description: "面向校长、老师、家长和学生的晚辅托管 MVP 系统",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
