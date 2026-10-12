import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CalendarCheck, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorMessage, apiFieldErrors } from "@/lib/apiErrors";
import { usePageMeta } from "@/lib/seo";
import { validateContactForm } from "@/lib/validation";
import { SubmissionReceipt } from "@/components/site/SubmissionReceipt";
import { Eyebrow } from "@/components/site/Sections";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Mirrors the ContactLeadReceipt Pydantic model in backend/models/leads.py.
interface ContactLeadReceipt {
  id: string;
  status: "received";
  received_at: string;
  message: string;
}

const BUSINESS_TYPES = ["CPG Brand", "Retailer", "Consulting Firm", "Analytics Team", "Other"] as const;
const CHALLENGES = [
  "Sales and Category Analysis",
  "Brand and Product Performance",
  "Retailer and Distribution Analysis",
  "Pricing and Promotion Analysis",
  "AI-Assisted Analytics",
  "Reporting and Business Reviews",
  "Other",
] as const;

interface FormState {
  fullName: string;
  workEmail: string;
  company: string;
  jobTitle: string;
  businessType: string;
  primaryChallenge: string;
  message: string;
  marketingOptIn: boolean;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  workEmail: "",
  company: "",
  jobTitle: "",
  businessType: "",
  primaryChallenge: "",
  message: "",
  marketingOptIn: false,
};

export default function Contact() {
  usePageMeta({
    title: "Contact & Request a Demo | CPGist",
    description:
      "Tell CPGist about your CPG analytics challenges — sales and category analysis, brand performance, retail and distribution, pricing and promotions — and request a demo.",
    path: "/contact",
  });

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContactLeadReceipt | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: (payload: {
      full_name: string;
      work_email: string;
      company: string;
      job_title: string;
      business_type: string;
      primary_challenge: string;
      message: string | null;
      marketing_opt_in: boolean;
    }) => apiPost<ContactLeadReceipt>("/contact/leads", payload),
    onSuccess: (data) => {
      setReceipt(data);
      setServerError(null);
      toast.success("Your demo request was received.");
    },
    onError: (err) => {
      setErrors(apiFieldErrors(err));
      setServerError(apiErrorMessage(err, "Your request couldn't be sent because of a server error. Your entries are kept below — please retry in a moment."));
      toast.error(apiErrorMessage(err, "Your request couldn't be sent."));
    },
  });

  const validate = (): boolean => {
    const next = validateContactForm(form);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return; // prevent duplicate submissions while processing
    if (!validate()) return;
    mutation.mutate({
      full_name: form.fullName.trim(),
      work_email: form.workEmail.trim(),
      company: form.company.trim(),
      job_title: form.jobTitle.trim(),
      business_type: form.businessType,
      primary_challenge: form.primaryChallenge,
      message: form.message.trim() ? form.message.trim() : null,
      marketing_opt_in: form.marketingOptIn,
    });
  };

  const fieldError = (key: keyof FormState) =>
    errors[key] ? (
      <p id={`contact-${key}-error`} role="alert" className="mt-1.5 text-xs text-rose-600">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="bg-page">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <Eyebrow>Contact &amp; demo</Eyebrow>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-balance text-navy-950 sm:text-4xl lg:text-5xl">
            Let&rsquo;s talk about your CPG analytics challenges.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            Tell us about your business, your analytical needs, and the decisions you want to make
            with better data.
          </p>

          <ul className="mt-8 space-y-4">
            <li className="flex gap-3">
              <MailCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-700" />
              <p className="text-sm leading-relaxed text-slate-600">
                We review every request and reply to your work email — no automated sales sequences,
                and your details aren't shared with third parties.
              </p>
            </li>
            <li className="flex gap-3">
              <CalendarCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-700" />
              <p className="text-sm leading-relaxed text-slate-600">
                The demo walks through the workspace using sample data, or a dataset you're able to
                share — whatever your team prefers.
              </p>
            </li>
            <li className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-700" />
              <p className="text-sm leading-relaxed text-slate-600">
                We ask only for what we need to reply usefully, and submissions are stored on
                CPGist's own backend. See our{" "}
                <Link to="/privacy" className="font-semibold text-navy-700 underline underline-offset-2" data-testid="contact-privacy-link">
                  Privacy Policy
                </Link>
                .
              </p>
            </li>
          </ul>
        </div>

        <div>
          {receipt ? (
            <SubmissionReceipt
              testid="contact-success-card"
              heading="Request received"
              message={receipt.message}
              fields={[
                { label: "Reference ID", value: receipt.id, testid: "contact-reference-id", mono: true },
                { label: "Status", value: receipt.status },
                { label: "Received", value: new Date(receipt.received_at).toLocaleString() },
              ]}
              footnote="Your consent choices were recorded with this submission. Marketing emails are only sent if you opted in, and every marketing email includes an unsubscribe link."
              onReset={() => {
                setReceipt(null);
                setForm(INITIAL_FORM);
              }}
              resetLabel="Submit another request"
              resetTestid="contact-submit-another"
            />
          ) : (
            <form onSubmit={onSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8" aria-labelledby="contact-form-heading" data-testid="contact-form">
              <h2 id="contact-form-heading" className="text-lg font-bold text-navy-950">Request a demo</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Required fields are marked with *. We use these details only to respond to your
                enquiry and prepare a relevant demo.
              </p>

              {serverError && (
                <div role="alert" className="mt-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="contact-server-error">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact-full-name">Full name <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Input
                    id="contact-full-name"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "contact-fullName-error" : undefined}
                    className="mt-1.5"
                    data-testid="contact-input-full-name"
                  />
                  {fieldError("fullName")}
                </div>
                <div>
                  <Label htmlFor="contact-work-email">Work email <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Input
                    id="contact-work-email"
                    type="email"
                    autoComplete="email"
                    value={form.workEmail}
                    onChange={(e) => set("workEmail", e.target.value)}
                    aria-invalid={Boolean(errors.workEmail)}
                    aria-describedby={errors.workEmail ? "contact-workEmail-error" : undefined}
                    className="mt-1.5"
                    data-testid="contact-input-work-email"
                  />
                  {fieldError("workEmail")}
                </div>
                <div>
                  <Label htmlFor="contact-company">Company <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Input
                    id="contact-company"
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                    aria-invalid={Boolean(errors.company)}
                    aria-describedby={errors.company ? "contact-company-error" : undefined}
                    className="mt-1.5"
                    data-testid="contact-input-company"
                  />
                  {fieldError("company")}
                </div>
                <div>
                  <Label htmlFor="contact-job-title">Job title <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Input
                    id="contact-job-title"
                    autoComplete="organization-title"
                    value={form.jobTitle}
                    onChange={(e) => set("jobTitle", e.target.value)}
                    aria-invalid={Boolean(errors.jobTitle)}
                    aria-describedby={errors.jobTitle ? "contact-jobTitle-error" : undefined}
                    className="mt-1.5"
                    data-testid="contact-input-job-title"
                  />
                  {fieldError("jobTitle")}
                </div>
                <div>
                  <Label htmlFor="contact-business-type">Business type <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Select value={form.businessType} onValueChange={(v: string) => set("businessType", v)}>
                    <SelectTrigger
                      id="contact-business-type"
                      className="mt-1.5 w-full"
                      aria-invalid={Boolean(errors.businessType)}
                      aria-describedby={errors.businessType ? "contact-businessType-error" : undefined}
                      data-testid="contact-select-business-type"
                    >
                      <SelectValue placeholder="Select a business type">{(v: string) => v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError("businessType")}
                </div>
                <div>
                  <Label htmlFor="contact-challenge">Primary challenge <span aria-hidden="true" className="text-rose-600">*</span></Label>
                  <Select value={form.primaryChallenge} onValueChange={(v: string) => set("primaryChallenge", v)}>
                    <SelectTrigger
                      id="contact-challenge"
                      className="mt-1.5 w-full"
                      aria-invalid={Boolean(errors.primaryChallenge)}
                      aria-describedby={errors.primaryChallenge ? "contact-primaryChallenge-error" : undefined}
                      data-testid="contact-select-challenge"
                    >
                      <SelectValue placeholder="Select a challenge">{(v: string) => v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError("primaryChallenge")}
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="contact-message">Message (optional)</Label>
                <Textarea
                  id="contact-message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Tell us about your data, your team, and the decisions you want to make."
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "contact-message-error" : undefined}
                  className="mt-1.5"
                  data-testid="contact-textarea-message"
                />
                {fieldError("message")}
              </div>

              <div className="mt-4 flex items-start gap-3">
                <Checkbox
                  id="contact-marketing"
                  checked={form.marketingOptIn}
                  onCheckedChange={(c) => set("marketingOptIn", c === true)}
                  data-testid="contact-checkbox-marketing"
                />
                <Label htmlFor="contact-marketing" className="text-sm font-normal leading-relaxed text-slate-600">
                  Email me occasional CPGist product updates. Optional and unchecked — accepting
                  service terms isn't bundled with marketing consent, and you can unsubscribe at
                  any time.
                </Label>
              </div>

              <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={mutation.isPending} data-testid="contact-submit-button">
                {mutation.isPending ? (
                  <>
                    <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Request a Demo"
                )}
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Submissions are validated on the server too. If sending fails, you'll see a clear
                error here — we never show a success message for a failed submission.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
