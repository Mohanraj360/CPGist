import { NextRequest, NextResponse } from "next/server";
import type { Content, Part } from "@google/generative-ai";
import { getAiConfig } from "@/lib/ai-config";
import { toolDeclarations, callTool, buildSystemPrompt, inferAudience } from "@/lib/gemini-tools";
import type { Audience, AudienceSelection } from "@/lib/types";
import { analysisCacheKey, cacheAnalysis, getCachedAnalysis, getInFlightAnalysis, setInFlightAnalysis } from "@/lib/agent-cache";

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

function isRateLimited(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|too many requests|quota exceeded|resource exhausted/i.test(message);
}

function retryAfterSeconds(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/(?:retry[- ]?after|retry in)\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)/i);
  return match ? Math.max(1, Math.ceil(Number(match[1]))) : null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithBackoff(model: { generateContent: (args: { contents: Content[] }) => Promise<any> }, contents: Content[], requestId: string, callCount: { value: number }) {
  const delays = [2000, 5000];
  for (let attempt = 0; ; attempt += 1) {
    callCount.value += 1;
    try {
      return await model.generateContent({ contents });
    } catch (error) {
      if (!isRateLimited(error) || attempt >= delays.length) throw error;
      console.warn(`[CPGIST_AGENT] requestId: ${requestId} geminiStatus: rate_limited retry: ${attempt + 1}`);
      await wait(delays[attempt]);
    }
  }
}

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
    const cacheKey = analysisCacheKey({ query: prompt, workflow: resolvedAudience });
    const cached = getCachedAnalysis(cacheKey);
    if (cached) return NextResponse.json({ ...cached, cached: true }, { headers: { "x-request-id": requestId } });

    const { client, modelName } = getAiConfig();
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemPrompt(resolvedAudience),
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    const contents: Content[] = [{ role: "user", parts: [{ text: prompt }] }];
    console.log("[CPGIST_AGENT] Gemini message roles:", contents.map((message) => message.role));
    const geminiCallCount = { value: 0 };
    let result = await generateWithBackoff(model, contents, requestId, geminiCallCount);

    const sourceTrace: SourceTraceEntry[] = [];
    let chartData: unknown = null;

    // Resolve tool calls without sending OpenAI-style function messages.
    // Database results are explicitly labeled analysis context in a user turn.
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

      const modelContent = result.response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push({
          role: "model",
          parts: modelContent.parts as Part[],
        });
      }
      contents.push({
        role: "user",
        parts: [{
          text: `Data retrieved for analysis from ${call.name}:\n${JSON.stringify(toolResult)}`,
        }],
      });
      console.log("[CPGIST_AGENT] Gemini message roles:", contents.map((message) => message.role));
      result = await generateWithBackoff(model, contents, requestId, geminiCallCount);
    }

    const fullText = result.response.text();
    const { narrative, recommendations } = splitNarrativeAndRecommendations(fullText);
    const dataAvailable = sourceTrace.some((entry) => entry.source_tables.length > 0);
    const dataMessage = dataAvailable ? undefined : "No connected retail data was available for this analysis.";

    const insights = narrative ? [narrative] : [];
    const analysisId = crypto.randomUUID();
    console.log(`[CPGIST_AGENT] requestId: ${requestId} workflow: ${resolvedAudience} databaseStatus: ${dataAvailable ? "success" : "no_data"} geminiCallCount: ${geminiCallCount.value} geminiStatus: success responseStatus: 200`);
    const responseBody = {
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
    };
    cacheAnalysis(cacheKey, responseBody);
    return NextResponse.json(responseBody, { headers: { "x-request-id": requestId } });
  } catch (err: unknown) {
    console.error("[v0] Agent route error", err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    const rateLimited = isRateLimited(err);
    const status = message === "AI provider is not configured" ? 503 : rateLimited ? 429 : 500;
    console.error(`[CPGIST_AGENT] requestId: ${requestId} workflow: unknown databaseStatus: unknown geminiCallCount: unknown geminiStatus: ${rateLimited ? "rate_limited" : "failed"} responseStatus: ${status}`);
    return NextResponse.json(
      {
        success: false,
        errorCode: status === 503 ? "AI_PROVIDER_NOT_CONFIGURED" : rateLimited ? "AI_RATE_LIMITED" : "AI_PROVIDER_FAILED",
        message: status === 503 ? "The AI analysis service is not configured." : rateLimited ? "AI analysis is temporarily unavailable due to API usage limits. Please try again shortly." : "The AI analysis service could not process this request.",
        retryAfter: rateLimited ? retryAfterSeconds(err) : null,
        requestId,
      },
      { status, headers: { "x-request-id": requestId, ...(rateLimited ? { "Retry-After": String(retryAfterSeconds(err) ?? 10) } : {}) } },
    );
  }
}
