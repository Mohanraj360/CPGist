import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CPGist — Your AI analyst for CPG and retail",
  description: "Assign analytical work, trace evidence, and turn CPG and retail data into decisions.",
};

export const viewport: Viewport = { themeColor: "#f6f7f4", userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
