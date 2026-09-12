import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolDeclarations, callTool, buildSystemPrompt, inferAudience } from "@/lib/gemini-tools";
import type { Audience, AudienceSelection } from "@/lib/types";

export const runtime = "nodejs";

interface SourceTraceEntry {
  tool: string;
  args: Record<string, unknown>;
  source_tables: string[];
}

// Gemini writes narrative + a "Recommendations:" list as one text block
// (per SYSTEM_PROMPT). Split them so the UI can render each separately.
function splitNarrativeAndRecommendations(text: string): { narrative: string; recommendations: string[] } {
  const marker = /recommend(ed actions|ations)?:?/i;
  const match = text.search(marker);
  if (match === -1) return { narrative: text.trim(), recommendations: [] };

  const narrative = text.slice(0, match).trim();
  const rest = text.slice(match);
  const recommendations = rest
    .split("\n")
    .map((line) => line.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((line) => line.length > 0 && !marker.test(line));

  return { narrative, recommendations };
}

const VALID_AUDIENCES: Audience[] = ["category_manager", "trade", "supply_planning", "exec"];

function resolveAudience(message: string, requested: unknown): Audience {
  if (typeof requested === "string" && (VALID_AUDIENCES as string[]).includes(requested)) {
    return requested as Audience;
  }
  // "auto", missing, or an invalid value all fall back to inference.
  return inferAudience(message);
}

export async function POST(req: NextRequest) {
  try {
    const { message, audience } = (await req.json()) as {
      message?: string;
      audience?: AudienceSelection;
    };
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing 'message' string in request body." }, { status: 400 });
    }

    const resolvedAudience = resolveAudience(message, audience);

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      console.error("[v0] Missing GEMINI_API_KEY in the server runtime");
      return NextResponse.json({ error: "Gemini is not configured on the server. Add GEMINI_API_KEY to the active deployment environment and redeploy." }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: buildSystemPrompt(resolvedAudience),
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(message);

    const sourceTrace: SourceTraceEntry[] = [];
    let chartData: unknown = null;

    // Function-calling loop: keep resolving tool calls until Gemini returns
    // a plain text response (cap iterations to avoid runaway loops).
    for (let i = 0; i < 5; i++) {
      const call = result.response.functionCalls()?.[0];
      if (!call) break;

      const toolResult = await callTool(call.name, call.args);

      sourceTrace.push({
        tool: call.name,
        args: call.args as Record<string, unknown>,
        source_tables: (toolResult as any).source_tables ?? [],
      });

      // Keep the most recent tool result around as a chart-data candidate —
      // the frontend decides how (or whether) to render it.
      chartData = toolResult;

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: toolResult as Record<string, unknown>,
          },
        },
      ]);
    }

    const fullText = result.response.text();
    const { narrative, recommendations } = splitNarrativeAndRecommendations(fullText);

    return NextResponse.json({
      narrative,
      recommendations,
      chartData,
      sourceTrace,
      audience: resolvedAudience,
    });
  } catch (err: any) {
    console.error("Agent route error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
