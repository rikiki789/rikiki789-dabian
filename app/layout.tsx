import type { Metadata } from "next";
import type { Viewport } from "next";
import { Long_Cang } from "next/font/google";
import "./globals.css";

const longCang = Long_Cang({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Kaiti SC", "STKaiti", "KaiTi", "serif"],
});

export const metadata: Metadata = {
  title: "P∞P",
  description: "一个干净、匿名、临时的共时 App。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#f2f5f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${longCang.variable} antialiased`}>{children}</body>
    </html>
  );
}
