import { NextRequest, NextResponse } from "next/server";
import { getForecast } from "@/lib/tools/getForecast";

export const runtime = "nodejs";

// Called directly by the What-If Simulator sliders — bypasses Gemini so the
// chart updates instantly as the user drags, instead of waiting on an LLM call.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brand, retailer, promo_depth, promo_duration } = body;

    if (!brand || !retailer || promo_depth == null || promo_duration == null) {
      return NextResponse.json(
        { error: "Requires brand, retailer, promo_depth, promo_duration." },
        { status: 400 }
      );
    }

    const forecast = await getForecast({ brand, retailer, promo_depth, promo_duration });

    // Phase 5: getForecast can now return found:false (unmatched brand or
    // retailer) instead of always returning a numeric projection. Surface
    // that as 404 so the caller doesn't have to sniff the body shape.
    if ((forecast as any).found === false) {
      return NextResponse.json(forecast, { status: 404 });
    }

    return NextResponse.json(forecast);
  } catch (err: any) {
    console.error("Forecast route error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
