import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CPGist — CPG AI Analyst",
  description: "Ask retail-analytics questions in plain English, get CPG insights with full source traceability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink text-white min-h-screen">{children}</body>
    </html>
  );
}
