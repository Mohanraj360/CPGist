"use client";

import { useState } from "react";
import ChatUI from "@/components/ChatUI";
import WhatIfSimulator from "@/components/WhatIfSimulator";

export default function Home() {
  const [tab, setTab] = useState<"chat" | "whatif">("chat");

  return (
    <div className="flex flex-col h-screen">
      <div className="flex gap-1 px-4 pt-3 border-b border-white/10">
        {(["chat", "whatif"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg ${
              tab === t ? "bg-panel text-white" : "text-muted hover:text-white"
            }`}
          >
            {t === "chat" ? "Chat" : "What-If Simulator"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "chat" ? <ChatUI /> : <WhatIfSimulator />}
      </div>
    </div>
  );
}
