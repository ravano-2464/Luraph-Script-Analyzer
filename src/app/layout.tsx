import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luraph Script Analyzer - Code Auditing & Reverse Engineering Assistant",
  description: "A secure static code analyzer and AST explorer designed to safely inspect obfuscated JavaScript and Lua files.",
  keywords: ["Luraph", "obfuscation", "security audit", "AST explorer", "reverse engineering", "static analysis"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#060814] text-slate-200">
        {children}
      </body>
    </html>
  );
}
