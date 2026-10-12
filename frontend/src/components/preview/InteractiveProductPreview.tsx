import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiErrors";
import { buildAnalystContext, type AnalystAnswer } from "@/lib/analyst";
import { BrandComparisonChart, WeeklySalesChart } from "@/components/preview/PreviewCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EvidencePill, type EvidenceKind } from "@/components/site/Sections";
import { cn } from "@/lib/utils";
import {
  BRANDS,
  RETAILERS,
  SAMPLE_QUESTIONS,
  TIME_PERIODS,
  brandSeries,
  fmtMoney,
  fmtPct,
  fmtRatio,
  fmtSigned,
  fmtUnits,
  periodWindow,
  retailerTable,
  samplePriceVolumeAnswer,
  sampleVelocityAnswer,
  summarize,
  weeklySeries,
  type BrandFilter,
  type RetailerFilter,
  type TimePeriodId,
} from "@/lib/dataset";

type Preset = 0 | 1 | "custom" | null;
function KpiCard({ testid, label, value, delta }: { testid: string; label: string; value: string; delta: number | null }) {
  return (
    <div data-testid={testid} className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-navy-950 sm:text-2xl">{value}</p>
      <p
        className={cn(
          "mt-1 text-xs font-medium tabular-nums",
          delta === null ? "text-slate-400" : delta >= 0 ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {delta === null ? "No prior-period data in sample" : `${fmtSigned(delta)} vs prior period`}
      </p>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  testid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testid: string;
}) {
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <div className="w-full sm:w-48">
      <Label htmlFor={id} className="text-xs font-medium text-slate-500">
        {label}
      </Label>
      <Select value={value} onValueChange={(v: string) => onChange(v)}>
        <SelectTrigger id={id} className="mt-1 w-full bg-white" data-testid={testid}>
          <SelectValue>{(v: string) => labelFor(v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The interactive CPGist product preview. One synthetic dataset drives every
 * KPI, chart, table and AI sample response, so numbers stay consistent when
 * filters change. Clearly labelled as illustrative sample data.
 */
export default function InteractiveProductPreview({ variant = "full", className }: { variant?: "hero" | "full"; className?: string }) {
  const [period, setPeriod] = useState<TimePeriodId>("l12w");
  const [brand, setBrand] = useState<BrandFilter>("all");
  const [retailer, setRetailer] = useState<RetailerFilter>("all");
  const [preset, setPreset] = useState<Preset>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [liveAnswer, setLiveAnswer] = useState<AnalystAnswer | null>(null);

  const scope = useMemo(() => periodWindow(period, brand, retailer), [period, brand, retailer]);
  const summary = useMemo(() => summarize(scope), [scope]);
  const weekly = useMemo(() => weeklySeries(scope), [scope]);
  const brands = useMemo(() => brandSeries(scope), [scope]);
  const retailers = useMemo(() => retailerTable(scope), [scope]);

  const periodLabelForCtx = TIME_PERIODS.find((p) => p.id === period)?.label ?? "";

  // Live AI Analyst — reasons only over the dataset slice currently displayed.
  const askAnalyst = useMutation({
    mutationFn: (question: string) =>
      apiPost<AnalystAnswer>("/analyst/ask", {
        question,
        context: buildAnalystContext(scope, periodLabelForCtx, brand, retailer),
      }),
    onSuccess: (data) => {
      setLiveAnswer(data);
      setCustomError(null);
      setPreset(null);
    },
    onError: (err) => {
      setLiveAnswer(null);
      setCustomError(apiErrorMessage(err, "The AI Analyst couldn't answer that just now. Please try again."));
    },
  });

  const answer: AnalystAnswer | null = useMemo(() => {
    if (liveAnswer) return liveAnswer;
    if (preset === null || preset === "custom") return null;
    const sample = preset === 0 ? sampleVelocityAnswer(scope) : samplePriceVolumeAnswer(scope);
    return { ...sample, source: "fallback" };
  }, [liveAnswer, preset, scope]);

  useEffect(() => {
    if (preset === "custom" && !customQuestion.trim()) setPreset(null);
  }, [customQuestion, preset]);

  const periodLabel = TIME_PERIODS.find((p) => p.id === period)?.label ?? "";
  const tid = (name: string) => (variant === "hero" ? `preview-hero-${name}` : `preview-${name}`);

  const kpis = [
    { id: "sales", label: "Gross sales", value: fmtMoney(summary.sales), delta: summary.salesGrowth },
    { id: "units", label: "Units sold", value: fmtUnits(summary.units), delta: summary.unitsGrowth },
    { id: "acv", label: "% ACV distribution", value: fmtPct(summary.acv), delta: summary.acvGrowth },
    { id: "promo", label: "Promo lift", value: fmtRatio(summary.promoLift), delta: summary.promoLiftGrowth },
  ];

  const resetFilters = () => {
    setPeriod("l12w");
    setBrand("all");
    setRetailer("all");
  };

  const runCustom = () => {
    const q = customQuestion.trim();
    if (q.length < 5) {
      setCustomError("Type a question of at least 5 characters, or pick a sample investigation below.");
      return;
    }
    setCustomError(null);
    setLiveAnswer(null);
    askAnalyst.mutate(q);
  };

  return (
    <div className={cn("text-left", className)} data-testid={variant === "hero" ? "preview-hero" : "preview-interactive"}>
      {variant === "full" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-navy-950">Executive overview</h3>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                Sample preview · illustrative data
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="preview-reset-filters" className="text-slate-500">
              <RotateCcw aria-hidden="true" className="mr-1.5 size-3.5" />
              Reset
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <FilterSelect
              id="preview-filter-period"
              label="Time period"
              value={period}
              onChange={(v) => setPeriod(v as TimePeriodId)}
              options={TIME_PERIODS.map((p) => ({ value: p.id, label: p.label }))}
              testid="preview-filter-period"
            />
            <FilterSelect
              id="preview-filter-brand"
              label="Brand"
              value={brand}
              onChange={(v) => setBrand(v as BrandFilter)}
              options={[{ value: "all", label: "All brands" }, ...BRANDS.map((b) => ({ value: b, label: b }))]}
              testid="preview-filter-brand"
            />
            <FilterSelect
              id="preview-filter-retailer"
              label="Retailer"
              value={retailer}
              onChange={(v) => setRetailer(v as RetailerFilter)}
              options={[{ value: "all", label: "All retailers" }, ...RETAILERS.map((r) => ({ value: r, label: r }))]}
              testid="preview-filter-retailer"
            />
          </div>
        </>
      )}

      <div className={cn("grid grid-cols-2 gap-3", variant === "full" && "mt-4 xl:grid-cols-4")}>
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            testid={variant === "hero" ? `preview-hero-kpi-${kpi.id}` : `preview-kpi-${kpi.id}`}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
          />
        ))}
      </div>

      <div className={cn("grid gap-4", variant === "full" && "mt-4 lg:grid-cols-5")}>
        <WeeklySalesChart
          data={weekly}
          periodLabel={periodLabel}
          testid={tid("chart-weekly")}
          className={variant === "full" ? "lg:col-span-3" : undefined}
        />
        {variant === "full" && (
          <BrandComparisonChart
            data={brands}
            periodLabel={periodLabel}
            testid={tid("chart-brands")}
            className="lg:col-span-2"
          />
        )}
      </div>

      {variant === "full" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table data-testid="preview-table-retailers">
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-xs">Retailer</TableHead>
                <TableHead className="text-xs">Gross sales</TableHead>
                <TableHead className="text-xs">Sales growth</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Units / store / wk</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">% ACV</TableHead>
                <TableHead className="text-xs">Promo share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retailers.map((r) => (
                <TableRow key={r.retailer} data-testid={`preview-retailer-row-${r.retailer.toLowerCase().replace(/\s+/g, "-")}`}>
                  <TableCell className="text-sm font-medium text-navy-950">{r.retailer}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-700">{fmtMoney(r.sales)}</TableCell>
                  <TableCell className={cn("text-sm tabular-nums", r.growth === null ? "text-slate-400" : r.growth >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {fmtSigned(r.growth)}
                  </TableCell>
                  <TableCell className="hidden text-sm tabular-nums text-slate-700 sm:table-cell">{r.velocity.toFixed(1)}</TableCell>
                  <TableCell className="hidden text-sm tabular-nums text-slate-700 sm:table-cell">{fmtPct(r.acv)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-700">{fmtPct(r.promoShare)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* AI Analyst panel */}
      <div className="mt-4 rounded-xl bg-navy-800 p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 text-ice-300" />
          <h3 className="text-sm font-semibold">AI Analyst</h3>
          <Badge variant="outline" className="border-white/25 bg-white/10 text-ice-300">
            Live AI on sample data
          </Badge>
        </div>

        <div className="mt-3">
          <Label htmlFor="preview-ai-question" className="text-xs font-medium text-ice-300">
            Ask a business question
          </Label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <Input
              id="preview-ai-question"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="e.g. Why did unit velocity dip in Kroger last month?"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runCustom();
                }
              }}
              className="border-white/25 bg-white/95 text-navy-950 placeholder:text-slate-400"
              data-testid={tid("ai-question-input")}
            />
            <Button
              onClick={runCustom}
              disabled={askAnalyst.isPending}
              className="bg-white text-navy-800 hover:bg-ice-100"
              data-testid={tid("ai-run-button")}
            >
              {askAnalyst.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
          {customError && (
            <p role="alert" className="mt-2 text-xs text-rose-200" data-testid={tid("ai-custom-error")}>
              {customError}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-ice-300">Sample investigations:</p>
          {SAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setLiveAnswer(null);
                setPreset(i as 0 | 1);
                setCustomError(null);
              }}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm",
                preset === i ? "border-ice-300 bg-white/15 text-white" : "border-white/20 bg-white/5 text-ice-300 hover:bg-white/10",
              )}
              data-testid={tid(`ai-sample-${i}`)}
            >
              {q}
            </button>
          ))}
        </div>

        {answer ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-navy-950/40 p-4" data-testid={tid("ai-answer")} aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  answer.source === "live_ai"
                    ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
                    : "border-white/25 bg-white/10 text-ice-300"
                }
                data-testid={tid("ai-answer-source")}
              >
                {answer.source === "live_ai" ? "Live AI response" : "Precomputed sample response"}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              <span className="text-ice-300">Q:</span> {answer.question}
            </p>
            <ul className="mt-3 space-y-2.5">
              {answer.findings.map((f) => (
                <li key={`${f.kind}:${f.text}`} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2.5">
                  <EvidencePill kind={f.kind as EvidenceKind} className="shrink-0 sm:mt-0.5" />
                  <span className="text-sm leading-relaxed text-ice-300">{f.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ice-300/70">{answer.note}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ice-300/80" data-testid={tid("ai-empty")}>
            Ask your own question above for a live AI analysis of this sample data, or pick a
            sample investigation for an instant precomputed response.
          </p>
        )}
      </div>

      {variant === "full" && (
        <p className="mt-4 text-xs leading-relaxed text-slate-500" data-testid="preview-disclaimer">
          Illustrative sample data: 4 brands × 5 retailers × 52 synthetic weeks. Figures update together
          because they come from one dataset, and do not represent actual market performance or customer results.
        </p>
      )}
    </div>
  );
}
