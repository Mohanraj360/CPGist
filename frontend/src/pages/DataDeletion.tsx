import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorMessage, apiFieldErrors } from "@/lib/apiErrors";
import { usePageMeta } from "@/lib/seo";
import { validateDeletionRequest } from "@/lib/validation";
import { SubmissionReceipt } from "@/components/site/SubmissionReceipt";
import { Eyebrow } from "@/components/site/Sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mirrors the DataDeletionRequestReceipt Pydantic model in backend/models/leads.py.
interface DataDeletionRequestReceipt {
  id: string;
  status: "received";
  verification: "pending";
  received_at: string;
  message: string;
}

export default function DataDeletion() {
  usePageMeta({
    title: "Data Deletion Request | CPGist",
    description:
      "Request deletion of your personal information from CPGist. Requests are verified before any data is deleted or disclosed.",
    path: "/data-deletion",
  });

  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DataDeletionRequestReceipt | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { account_email: string; request_details: string }) =>
      apiPost<DataDeletionRequestReceipt>("/compliance/data-deletion-requests", payload),
    onSuccess: (data) => {
      setReceipt(data);
      setServerError(null);
      toast.success("Your data deletion request was recorded.");
    },
    onError: (err) => {
      setErrors(apiFieldErrors(err));
      setServerError(apiErrorMessage(err, "We couldn't record your request. Please try again."));
      toast.error(apiErrorMessage(err, "We couldn't record your request."));
    },
  });

  const validate = () => {
    const next = validateDeletionRequest(email, details);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ account_email: email.trim(), request_details: details.trim() });
  };

  return (
    <div className="bg-page">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <header className="max-w-3xl">
          <Eyebrow>Privacy rights</Eyebrow>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">Request deletion of your data</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Submit a deletion request for personal information associated with your email address.
            Requests are verified before anything is deleted or disclosed.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-navy-950">What this request may cover</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-600">
              <li className="flex gap-2"><span aria-hidden="true" className="text-navy-700">•</span> Contact and demo-request submissions associated with this email address.</li>
              <li className="flex gap-2"><span aria-hidden="true" className="text-navy-700">•</span> Marketing consent records, where present.</li>
              <li className="flex gap-2"><span aria-hidden="true" className="text-navy-700">•</span> Account information, once sign-in is connected to an identity provider.</li>
              <li className="flex gap-2"><span aria-hidden="true" className="text-navy-700">•</span> Uploaded datasets in the analytics workspace, once the workspace is available.</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-navy-950">What happens next</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <li className="flex gap-3">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">1</span>
                Your request is recorded with the status “received” and a reference ID.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">2</span>
                We verify that the email belongs to you before disclosing or deleting anything.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">3</span>
                The request is completed, or lawfully declined with an explanation.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">4</span>
                Backups roll off on their normal schedule; records the law requires us to keep are retained as required.
              </li>
            </ol>
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800" role="note">
              Submitting this form does not delete anything immediately, and we won't claim deletion
              happened before the underlying storage has actually been handled. See our{" "}
              <Link to="/privacy" className="font-semibold underline underline-offset-2">
                Privacy Policy
              </Link>{" "}
              for retention details.
            </p>
          </div>

          <div>
            {receipt ? (
              <SubmissionReceipt
                testid="deletion-success-card"
                heading="Request received"
                message={receipt.message}
                fields={[
                  { label: "Reference ID", value: receipt.id, testid: "deletion-reference-id", mono: true },
                  { label: "Status", value: receipt.status, testid: "deletion-request-status" },
                  { label: "Verification", value: receipt.verification, testid: "deletion-verification-status" },
                ]}
                footnote="Keep this reference ID — it identifies your request in any follow-up."
                onReset={() => {
                  setReceipt(null);
                  setEmail("");
                  setDetails("");
                }}
                resetLabel="Submit another request"
                resetTestid="deletion-submit-another"
              />
            ) : (
              <form onSubmit={onSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8" aria-labelledby="deletion-form-heading">
                <h2 id="deletion-form-heading" className="text-lg font-bold text-navy-950">Deletion request form</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  We ask for your email to locate the data and verify your identity, and for details
                  so we handle the right records. These fields are used only for this request.
                </p>

                {serverError && (
                  <div role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="deletion-server-error">
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <div className="mt-5">
                  <Label htmlFor="deletion-email">Account email <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Input
                    id="deletion-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(errors.account_email)}
                    aria-describedby={errors.account_email ? "deletion-email-error" : undefined}
                    className="mt-1.5"
                    data-testid="deletion-email-input"
                  />
                  {errors.account_email && (
                    <p id="deletion-email-error" role="alert" className="mt-1.5 text-xs text-rose-600">{errors.account_email}</p>
                  )}
                </div>

                <div className="mt-4">
                  <Label htmlFor="deletion-details">Request details <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Textarea
                    id="deletion-details"
                    rows={5}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="e.g. Please delete the demo request I submitted and any associated contact details."
                    aria-invalid={Boolean(errors.request_details)}
                    aria-describedby={errors.request_details ? "deletion-details-error" : undefined}
                    className="mt-1.5"
                    data-testid="deletion-details-input"
                  />
                  {errors.request_details && (
                    <p id="deletion-details-error" role="alert" className="mt-1.5 text-xs text-rose-600">{errors.request_details}</p>
                  )}
                </div>

                <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={mutation.isPending} data-testid="deletion-submit-button">
                  {mutation.isPending ? (
                    <>
                      <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit deletion request"
                  )}
                </Button>
                <p className="mt-3 text-xs text-slate-500">
                  Submissions are validated on the server as well; malformed requests are rejected
                  with a clear error rather than silently discarded.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
