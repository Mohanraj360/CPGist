"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import SignOutButton from "@/components/SignOutButton";
import AlertsFeed from "@/components/AlertsFeed";
import type { ChatMessage, AudienceSelection } from "@/lib/types";
import { AUDIENCE_LABELS } from "@/lib/types";

const AUDIENCE_OPTIONS: { value: AudienceSelection; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "category_manager", label: AUDIENCE_LABELS.category_manager },
  { value: "trade", label: AUDIENCE_LABELS.trade },
  { value: "supply_planning", label: AUDIENCE_LABELS.supply_planning },
  { value: "exec", label: AUDIENCE_LABELS.exec },
];

export default function ChatUI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<AudienceSelection>("auto");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, audience }),
      });
      const data = await res.json();

      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        text: res.ok ? data.narrative : `Something went wrong: ${data.error}`,
        recommendations: data.recommendations,
        chartData: data.chartData,
        sourceTrace: data.sourceTrace,
        audience: data.audience,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "agent", text: `Request failed: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar onSelectTemplate={(prompt) => setInput(prompt)} />

      <div className="flex-1 flex flex-col">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold">CPGist</h1>
            <p className="text-xs text-muted">CPG AI analyst — synthetic data, India/Gulf/APAC coverage incl. Quick Commerce</p>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Audience framing">
            <span className="text-xs text-muted mr-1 hidden sm:inline">Frame for:</span>
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAudience(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  audience === opt.value
                    ? "bg-accent text-white"
                    : "bg-panel text-muted hover:text-white hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <AlertsFeed />
            <SignOutButton />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-muted text-sm">
              Ask something like "Analyze promo lift for Bold Snacks on QuickDash" or pick a template on the left.
              Leave framing on Auto or pick an audience above — same data, different emphasis. The bell icon
              surfaces velocity anomalies the daily background job finds on its own, no need to ask.
            </div>
          )}
          {messages.map((m) => (
            <ChatMessageBubble key={m.id} message={m} />
          ))}
          {loading && <div className="text-muted text-sm">Thinking…</div>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-white/10 p-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe a retail-analytics task…"
            className="flex-1 bg-panel rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-accent px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
