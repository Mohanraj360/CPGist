import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CPGist — CPG AI Analyst",
  description: "A focused AI workspace for retail and consumer packaged goods analysis.",
};

export const viewport: Viewport = { themeColor: "#f6f7f4", userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
