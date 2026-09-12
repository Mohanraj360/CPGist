import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import type { Audience } from "@/lib/types";
import { getBrandRanking } from "@/lib/tools/getBrandRanking";
import { getPromoLiftAnalysis } from "@/lib/tools/getPromoLiftAnalysis";
import { getChannelMix } from "@/lib/tools/getChannelMix";
import { getDistributionWhitespace } from "@/lib/tools/getDistributionWhitespace";
import { getForecast } from "@/lib/tools/getForecast";
import { getBrandContext } from "@/lib/tools/getBrandContext";
import { getCompetitiveSignals } from "@/lib/tools/getCompetitiveSignals";

// Declarations exposed to Gemini's function-calling API.
export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_brand_ranking",
    description: "Rank brands within a category by dollar sales and category share.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: { type: SchemaType.STRING, description: "e.g. 'Salty Snacks' or 'Sparkling Water'" },
        retailer: { type: SchemaType.STRING, description: "Optional retailer name to filter to" },
        date_range: {
          type: SchemaType.OBJECT,
          properties: {
            start: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
            end: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
          },
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_promo_lift_analysis",
    description: "Analyze % unit lift during promo weeks vs. trailing non-promo baseline, optionally by brand/retailer.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        brand: { type: SchemaType.STRING },
        retailer: { type: SchemaType.STRING },
        date_range: {
          type: SchemaType.OBJECT,
          properties: {
            start: { type: SchemaType.STRING },
            end: { type: SchemaType.STRING },
          },
        },
      },
    },
  },
  {
    name: "get_channel_mix",
    description: "% of a brand's dollar sales by retailer channel (Grocery, Club, Quick Commerce, General Trade, etc).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        brand: { type: SchemaType.STRING },
      },
      required: ["brand"],
    },
  },
  {
    name: "get_distribution_whitespace",
    description: "Find retailers where a brand's ACV distribution is meaningfully below the category average — expansion opportunities. Optionally narrow to one region.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        brand: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
        region: { type: SchemaType.STRING, description: "Optional, e.g. 'India - Metro', 'Gulf - Qatar', 'SEA - Malaysia'. Omit to check all regions the brand has data in." },
      },
      required: ["brand", "category"],
    },
  },
  {
    name: "get_forecast",
    description: "Project promo lift % and incremental $ sales for a hypothetical promo depth and duration, using a fitted elasticity model.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        brand: { type: SchemaType.STRING },
        retailer: { type: SchemaType.STRING },
        promo_depth: { type: SchemaType.NUMBER, description: "% price discount, e.g. 20" },
        promo_duration: { type: SchemaType.NUMBER, description: "weeks" },
      },
      required: ["brand", "retailer", "promo_depth", "promo_duration"],
    },
  },
  {
    name: "get_brand_context",
    description:
      "Get a brand's sibling brands (shared parent company), competitive set (same category AND overlapping regions — not just same category), " +
      "and recent grounded signal notes (distribution gaps, in-portfolio cannibalization risk, overlapping competitor promo activity). " +
      "Call this alongside get_brand_ranking or get_promo_lift_analysis whenever competitive or portfolio context would materially change how a number should be read " +
      "— e.g. before attributing a lift or share swing entirely to a brand's own performance.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        brand: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING, description: "Optional, narrows the lookup if brand names collide across categories." },
      },
      required: ["brand"],
    },
  },
  {
    name: "get_competitive_signals",
    description:
      "Get recent time-stamped competitor events (currently: promo launches) for a brand's competitive set — not structural " +
      "relationships (that's get_brand_context), actual dated activity: which competitor ran a promo, when, at which retailer, and how deep. " +
      "Call this when the question is about competitive pressure or timing (e.g. 'is a competitor promoting right now', " +
      "'should we worry about X's competitive set this quarter') rather than just who the competitors are.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        brand: { type: SchemaType.STRING },
        lookback_weeks: { type: SchemaType.NUMBER, description: "Optional, defaults to 8." },
      },
      required: ["brand"],
    },
  },
];

// Dispatch a Gemini function call by name to the corresponding tool impl.
export async function callTool(name: string, args: any) {
  switch (name) {
    case "get_brand_ranking":
      return getBrandRanking(args);
    case "get_promo_lift_analysis":
      return getPromoLiftAnalysis(args);
    case "get_channel_mix":
      return getChannelMix(args);
    case "get_distribution_whitespace":
      return getDistributionWhitespace(args);
    case "get_forecast":
      return getForecast(args);
    case "get_brand_context":
      return getBrandContext(args);
    case "get_competitive_signals":
      return getCompetitiveSignals(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export const SYSTEM_PROMPT = `You are a CPG (Consumer Packaged Goods) retail analyst assistant.
You have tools to query sales velocity, promo lift, brand share, channel mix, distribution whitespace,
cross-brand context (sibling brands, category+region-scoped competitors, and grounded signal notes), and
time-stamped competitor activity (promo launches) for a synthetic CPG dataset covering Grocery, Club,
Natural, C-Store, Quick Commerce, and General Trade retailers across North America, India, Gulf, and SEA
regions.

When a user asks a question:
1. Decide which tool(s) answer it and call them.
2. If the question is about a specific brand's performance (ranking, promo lift, share swing), also call
   get_brand_context for that brand. If it returns a relevant signal note — a sibling cannibalization dip,
   an overlapping competitor promo, a regional distribution gap — factor that into your narrative instead
   of attributing the number purely to the brand's own performance. Don't call it for generic
   category-level or channel-mix questions where no single brand is in focus.
3. Once you have tool results, write a narrative insight in 2-4 sentences, in the tone of an
   experienced CPG analyst — reference velocity, distribution (ACV), and lift specifically, not generic BI phrases.
4. Follow with 2-3 concrete recommended actions.
5. Be explicit about which retailers/date ranges/regions/filters the numbers cover — do not generalize
   beyond what the tool data actually shows.`;

// ---------------------------------------------------------------------------
// Phase 3 — audience-aware answer framing
// ---------------------------------------------------------------------------
// Same underlying tool data, different emphasis in the narrative + which
// recommendations get surfaced. This is instructed at the system-prompt
// level (not just a UI label) so it actually changes what Gemini writes,
// not just how the response is styled client-side. Audience type lives in
// lib/types.ts (shared with the UI layer) — re-exported here for callers
// that only import from gemini-tools.
export type { Audience };

export const AUDIENCE_FRAMING: Record<Audience, string> = {
  category_manager: `Frame your answer for a Category Manager. Lead with shelf share, brand ranking
within the category, and how the numbers affect category strategy and retailer negotiations. Keep
recommendations retailer- and assortment-facing (e.g. shelf placement, category review talking points).`,
  trade: `Frame your answer for Trade / Trade Marketing. Lead with promo ROI — lift vs. estimated trade
spend, whether the promo depth/duration was worth it, and any cannibalization risk from get_brand_context.
Keep recommendations about promo calendar, discount depth, or retailer/channel selection for future promos.`,
  supply_planning: `Frame your answer for Supply Planning. Lead with distribution (ACV) and velocity trends
that affect forecasting and replenishment — stockout risk, distribution whitespace, demand swings. Keep
recommendations about distribution expansion, safety stock, or supply readiness, not trade spend or shelf talk.`,
  exec: `Frame your answer for an Exec audience with no patience for metric jargon. Lead with the single most
important headline number and its business impact in one plain-language sentence. Skip granular
methodology. Limit yourself to the top 1-2 implications and one clear recommended action.`,
};

// Builds the full system instruction for a given audience. Falls back to
// the base prompt with no audience framing appended if audience is omitted
// (keeps SYSTEM_PROMPT usable standalone for anything that doesn't care
// about audience framing).
export function buildSystemPrompt(audience?: Audience): string {
  if (!audience) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n${AUDIENCE_FRAMING[audience]}`;
}

// Lightweight keyword-based inference used when the user leaves the
// audience selector on "Auto" rather than picking one explicitly. Not a
// classifier — just a small deterministic keyword scorer, good enough to
// pick a reasonable default framing without asking the user to choose
// every time. Ties and no-match both fall back to category_manager, the
// most general of the four framings.
const AUDIENCE_KEYWORDS: Record<Audience, string[]> = {
  trade: ["promo", "lift", "tpr", "discount", "trade spend", "roi", "promotion", "deal", "bogo"],
  supply_planning: [
    "distribution", "acv", "stockout", "out of stock", "whitespace", "inventory", "in-stock", "replenish", "supply",
  ],
  exec: ["overall", "summary", "quarter", "board", "headline", "exec", "top-line", "portfolio performance", "bottom line"],
  category_manager: ["share", "ranking", "rank", "category", "shelf", "velocity", "brand share"],
};

export function inferAudience(message: string): Audience {
  const text = message.toLowerCase();
  let best: Audience = "category_manager";
  let bestScore = 0;

  (Object.keys(AUDIENCE_KEYWORDS) as Audience[]).forEach((audience) => {
    const score = AUDIENCE_KEYWORDS[audience].reduce(
      (count, kw) => (text.includes(kw) ? count + 1 : count),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = audience;
    }
  });

  return best;
}
