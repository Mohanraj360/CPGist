export interface SourceTraceEntry {
  tool: string;
  args: Record<string, unknown>;
  source_tables: string[];
}

// Phase 3: audience-aware framing. "auto" lets the server infer from the
// message text (see lib/gemini-tools.ts inferAudience); the other four are
// explicit user choices from the ChatUI toggle.
export type Audience = "category_manager" | "trade" | "supply_planning" | "exec";
export type AudienceSelection = Audience | "auto";

export const AUDIENCE_LABELS: Record<Audience, string> = {
  category_manager: "Category Manager",
  trade: "Trade",
  supply_planning: "Supply Planning",
  exec: "Exec",
};

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  recommendations?: string[];
  chartData?: unknown;
  sourceTrace?: SourceTraceEntry[];
  audience?: Audience; // set on agent messages: which framing was actually used
}
