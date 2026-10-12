import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CTARow, Eyebrow, MockWindow, Reveal } from "@/components/site/Sections";
import { EvidencePill } from "@/components/site/Sections";
import { usePageMeta } from "@/lib/seo";

const STEPS = [
  {
    title: "Upload supported data",
    body: "Bring a supported file into your CPGist workspace. Common sales, shipment, and promotion extracts (CSV or Excel) are accepted; unsupported formats are rejected up front with a clear reason.",
  },
  {
    title: "Validate and map data fields",
    body: "Column mapping connects your fields to CPGist's metric and dimension model. Missing or ambiguous fields are surfaced before analysis, not buried in results later.",
  },
  {
    title: "Explore available metrics",
    body: "Review the KPIs, trends, and dimensions your data actually supports — and see which metrics are unavailable because the underlying data is missing.",
  },
  {
    title: "Ask questions using AI Analyst",
    body: "Investigate changes in natural language. Responses are grounded in the data connected to your workspace and structured for verification.",
  },
  {
    title: "Review evidence and limitations",
    body: "Every response separates observed metrics, calculated comparisons, estimates, possible explanations, and missing evidence — so your team knows what stands on what.",
  },
  {
    title: "Prepare reports and determine next steps",
    body: "Assemble findings into executive-ready reviews, then decide what to investigate or do next with the limitations clearly stated.",
  },
];

export default function HowItWorks() {
  usePageMeta({
    title: "How It Works | CPGist",
    description:
      "From uploading supported data to preparing executive-ready reports: how CPGist turns CPG sales, retail, pricing, and promotion data into evidence-aware analysis.",
    path: "/how-it-works",
  });

  return (
    <>
      <section className="bg-page">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Eyebrow>How it works</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-balance text-navy-950 sm:text-4xl lg:text-5xl">
            From raw data to confident decisions, step by step.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            CPGist is built around an honest analytical workflow: get the data in, validate it,
            explore what it supports, investigate with AI, review the evidence, and prepare the
            decisions that follow.
          </p>
        </div>
      </section>

      <div className="bg-page pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <ol className="relative space-y-8 border-l-2 border-ice-200 pl-6 sm:pl-10">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.04}>
                <li className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[2.65rem] flex size-9 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white sm:-left-[3.4rem]"
                  >
                    {i + 1}
                  </span>
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-semibold text-navy-950">{step.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{step.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal className="mt-12">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6" role="note">
              <h2 className="text-lg font-semibold text-amber-800">Insight quality depends on data quality</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">
                The completeness, granularity, and accuracy of your source data shape how specific
                and how reliable the analysis can be. CPGist shows which metrics are fully observed
                and which are limited, instead of overclaiming precision — and it will tell you
                when a question needs data you haven't connected yet.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <MockWindow title="Evidence review — sample view">
              <div className="space-y-3 p-4 sm:p-6">
                <EvidencePill kind="observed" />
                <p className="text-sm text-slate-600">“Gross sales grew +12.4% while units grew +6.8% in the last 12 weeks.”</p>
                <EvidencePill kind="calculated" />
                <p className="text-sm text-slate-600">“Implied price/mix contribution: roughly +5.2 points (rough calculation).”</p>
                <EvidencePill kind="estimate" />
                <p className="text-sm text-slate-600">“Continuing the current trend projects the quarter near $5.4M.”</p>
                <EvidencePill kind="limitation" />
                <p className="text-sm text-slate-600">“No competitor pricing in the dataset — relative price position can't be verified.”</p>
                <p className="text-xs text-slate-500">Sample content for illustration — not a live AI service.</p>
              </div>
            </MockWindow>
          </Reveal>

          <CTARow
            className="mt-12"
            primary={{ label: "Request a Demo", to: "/contact", testid: "how-cta-request-demo" }}
            secondary={{ label: "Explore the Platform", to: "/platform", testid: "how-cta-explore-platform" }}
          />
        </div>
      </div>

      <section className="bg-navy-950 py-16 sm:py-20" aria-labelledby="how-final-cta-heading">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 id="how-final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Bring a dataset. Leave with better questions.
          </h2>
          <div className="mt-8 flex justify-center">
            <Link
              to="/contact"
              className={buttonVariants({ size: "lg", className: "bg-white text-navy-950 hover:bg-ice-100" })}
              data-testid="how-final-cta-request-demo"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
