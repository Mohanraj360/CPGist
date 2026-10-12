import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReceiptField {
  label: string;
  value: string;
  testid?: string;
  mono?: boolean;
}

/**
 * Shared success panel for server-backed form submissions (demo requests,
 * data-deletion requests). Shows the server's own message and reference fields,
 * so a success state is only ever rendered from a real 2xx response.
 */
export function SubmissionReceipt({
  heading,
  message,
  fields,
  footnote,
  onReset,
  resetLabel,
  resetTestid,
  testid,
}: {
  heading: string;
  message: string;
  fields: ReceiptField[];
  footnote?: ReactNode;
  onReset: () => void;
  resetLabel: string;
  resetTestid: string;
  testid: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8" role="status" data-testid={testid}>
      <CheckCircle2 aria-hidden="true" className="size-8 text-emerald-600" />
      <h2 className="mt-3 text-xl font-bold text-emerald-900">{heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-emerald-900">{message}</p>
      <dl className="mt-4 space-y-1.5 text-sm text-emerald-900">
        {fields.map((f) => (
          <div key={f.label} className="flex gap-2">
            <dt className="font-semibold">{f.label}:</dt>
            <dd className={f.mono ? "font-mono" : undefined} data-testid={f.testid}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      {footnote ? <p className="mt-4 text-xs leading-relaxed text-emerald-800">{footnote}</p> : null}
      <Button variant="outline" className="mt-6" onClick={onReset} data-testid={resetTestid}>
        {resetLabel}
      </Button>
    </div>
  );
}
