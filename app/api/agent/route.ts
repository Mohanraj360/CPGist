import { NextRequest, NextResponse } from "next/server";
import { getAiConfig } from "@/lib/ai-config";
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
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  console.log(`[v0] agent request started ${requestId}`);
  try {
    const { message, audience } = (await req.json()) as {
      message?: string;
      audience?: AudienceSelection;
    };
    const prompt = typeof message === "string" ? message.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Missing 'message' string in request body." }, { status: 400 });
    }

    const resolvedAudience = resolveAudience(prompt, audience);

    const { client, modelName } = getAiConfig();
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemPrompt(resolvedAudience),
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);

    const sourceTrace: SourceTraceEntry[] = [];
    let chartData: unknown = null;

    // Function-calling loop: keep resolving tool calls until Gemini returns
    // a plain text response (cap iterations to avoid runaway loops).
    for (let i = 0; i < 5; i++) {
      const call = result.response.functionCalls()?.[0];
      if (!call) break;

      let toolResult: Record<string, unknown>;
      try {
        toolResult = (await callTool(call.name, call.args)) as Record<string, unknown>;
      } catch (toolError) {
        console.warn(`[v0] Optional dataset unavailable for ${call.name}:`, toolError);
        toolResult = {
          ok: false,
          data_available: false,
          message: "No connected retail data was available for this analysis. Use general CPG business knowledge and state that the response is not data-grounded.",
          source_tables: [],
        };
      }

      sourceTrace.push({
        tool: call.name,
        args: call.args as Record<string, unknown>,
        source_tables: Array.isArray(toolResult.source_tables) ? toolResult.source_tables as string[] : [],
      });

      if (toolResult.ok !== false) chartData = toolResult;

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        },
      ]);
    }

    const fullText = result.response.text();
    const { narrative, recommendations } = splitNarrativeAndRecommendations(fullText);
    const dataAvailable = sourceTrace.some((entry) => entry.source_tables.length > 0);
    const dataMessage = dataAvailable ? undefined : "No connected retail data was available for this analysis.";

    const insights = narrative ? [narrative] : [];
    const analysisId = crypto.randomUUID();
    console.log(`[v0] agent request completed ${requestId}`, { tools: sourceTrace.map((entry) => entry.tool), dataAvailable });
    return NextResponse.json({
      success: true,
      dataAvailable,
      ...(dataMessage ? { message: dataMessage } : {}),
      analysisId,
      answer: narrative,
      executiveSummary: narrative,
      metrics: [],
      insights,
      recommendations,
      followUpQuestions: [],
      charts: chartData ? [chartData] : [],
      narrative,
      chartData,
      sourceTrace,
      audience: resolvedAudience,
    });
  } catch (err: unknown) {
    console.error("[v0] Agent route error", err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    const status = message === "AI provider is not configured" ? 503 : 500;
    console.error(`[v0] agent request failed ${requestId}`, { error: message });
    return NextResponse.json(
      { error: status === 503 ? "The analyst is temporarily unavailable." : "The analysis could not be completed.", requestId },
      { status, headers: { "x-request-id": requestId } },
    );
  }
}
