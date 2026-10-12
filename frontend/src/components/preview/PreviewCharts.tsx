import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/lib/recharts";
import { fmtMoney, fmtSigned, type BrandPoint, type WeeklyPoint } from "@/lib/dataset";
import { cn } from "@/lib/utils";

const AXIS_TICK = { fontSize: 11, fill: "#667085" } as const;
const GRID_STROKE = "#E2E8F0";

/** Screen-reader / keyboard accessible table equivalent of a chart. */
export function ChartDataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-100">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-2 py-1.5 font-medium text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-slate-100">
              {row.map((cell, j) => (
                <td key={headers[j] ?? j} className="px-2 py-1.5 tabular-nums text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartFigure({
  label,
  caption,
  testid,
  className,
  children,
  tableHeaders,
  tableRows,
}: {
  label: string;
  caption: string;
  testid: string;
  className?: string;
  children: React.ReactNode;
  tableHeaders: string[];
  tableRows: (string | number)[][];
}) {
  return (
    <figure className={cn("rounded-lg border border-slate-200 bg-white p-4", className)} aria-label={label}>
      <div data-testid={testid} className="h-44 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-slate-500">{caption}</figcaption>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-navy-700 underline underline-offset-2">View data as table</summary>
        <ChartDataTable headers={tableHeaders} rows={tableRows} />
      </details>
    </figure>
  );
}

/** Weekly gross sales vs estimated non-promo baseline. */
export function WeeklySalesChart({
  data,
  periodLabel,
  testid,
  className,
}: {
  data: WeeklyPoint[];
  periodLabel: string;
  testid: string;
  className?: string;
}) {
  return (
    <ChartFigure
      label={`Weekly gross sales trend for the selected filters (${periodLabel}). Values are illustrative sample data in US dollars.`}
      caption={`Weekly gross sales vs estimated non-promo baseline (${periodLabel}).`}
      testid={testid}
      className={className}
      tableHeaders={["Week", "Gross sales", "Non-promo baseline"]}
      tableRows={data.map((w) => [w.week, fmtMoney(w.sales), fmtMoney(w.baseline)])}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} minTickGap={28} />
        <YAxis tickFormatter={(v: number) => fmtMoney(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} />
        <Tooltip formatter={(value: number, name: string) => [fmtMoney(value), name]} />
        <Area type="monotone" dataKey="sales" name="Gross sales" stroke="#1E2761" strokeWidth={2} fill="#1E2761" fillOpacity={0.08} />
        <Line type="monotone" dataKey="baseline" name="Non-promo baseline" stroke="#AFC0EE" strokeWidth={2} strokeDasharray="5 4" dot={false} />
      </ComposedChart>
    </ChartFigure>
  );
}

/** Gross sales by brand for the current selection. */
export function BrandComparisonChart({
  data,
  periodLabel,
  testid,
  className,
}: {
  data: BrandPoint[];
  periodLabel: string;
  testid: string;
  className?: string;
}) {
  const withShortLabels = data.map((b) => ({ ...b, short: b.brand.split(" ")[0] }));
  return (
    <ChartFigure
      label={`Gross sales by brand for the selected filters (${periodLabel}). Values are illustrative sample data in US dollars.`}
      caption="Gross sales by brand, selected period."
      testid={testid}
      className={className}
      tableHeaders={["Brand", "Gross sales", "Growth vs prior"]}
      tableRows={data.map((b) => [b.brand, fmtMoney(b.sales), fmtSigned(b.growth)])}
    >
      <BarChart data={withShortLabels} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="short" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={0} />
        <YAxis tickFormatter={(v: number) => fmtMoney(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} />
        <Tooltip formatter={(value: number) => [fmtMoney(value), "Gross sales"]} />
        <Bar dataKey="sales" name="Gross sales" fill="#26307A" radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ChartFigure>
  );
}
