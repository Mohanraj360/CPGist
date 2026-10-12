import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { CTARow, Eyebrow, Reveal } from "@/components/site/Sections";
import { usePageMeta } from "@/lib/seo";

const AUDIENCES = [
  {
    id: "emerging-brands",
    label: "For Emerging CPG Brands",
    headline: "Understand performance and explore potential growth opportunities",
    description:
      "Understand business performance and explore potential growth opportunities using the data available to the business. When you're sold in a handful of retailers, every point of distribution and every promotion matters — and the data you have should work as hard as you do.",
    points: [
      "See sales, units, velocity, and distribution in one place instead of scattered retailer portals.",
      "Compare retailer performance to decide where the next push should go.",
      "Use the AI Analyst to investigate changes without waiting on analyst bandwidth.",
    ],
    testid: "solutions-emerging",
  },
  {
    id: "retail-sales-teams",
    label: "For Retail and Sales Teams",
    headline: "Investigate retailer performance, product trends, and potential distribution gaps",
    description:
      "Investigate retailer performance, product trends, and potential distribution gaps. Walk into every buyer review with evidence instead of anecdotes.",
    points: [
      "Retail-by-retail performance views: sales, growth, per-store velocity, promo share.",
      "Distribution signals highlight where a product is under-represented where the required data exists.",
      "Prepare buyer-meeting summaries from the same workspace you analyze in.",
    ],
    testid: "solutions-retail",
  },
  {
    id: "category-analysts",
    label: "For Category and Insights Teams",
    headline: "Explore category and brand changes and prepare structured analytical reviews",
    description:
      "Explore category and brand changes and prepare structured analytical reviews. Spend less time assembling spreadsheets and more time on the questions that matter.",
    points: [
      "Consistent metric definitions across brands, products, and retailers.",
      "Structured, evidence-aware outputs your stakeholders can interrogate.",
      "Executive-ready report outlines assembled from your actual findings.",
    ],
    testid: "solutions-analysts",
  },
  {
    id: "consultants",
    label: "For Consultants and Business Advisors",
    headline: "Support client discussions with clear analysis and executive-ready summaries",
    description:
      "Support client discussions with clear performance analysis, evidence-aware insights, and executive-ready summaries. Bring structure to the first day of every engagement.",
    points: [
      "Upload a client dataset and get a working analytical view quickly.",
      "Evidence-aware findings distinguish observed results from estimates and hypotheses.",
      "Professional reports that survive scrutiny from client analytics teams.",
    ],
    testid: "solutions-consultants",
  },
];

export default function Solutions() {
  usePageMeta({
    title: "Solutions | CPGist",
    description:
      "How CPGist helps emerging CPG brands, retail and sales teams, category and insights analysts, and consultants turn business data into clearer decisions.",
    path: "/solutions",
  });

  return (
    <>
      <section className="bg-page">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Eyebrow>Solutions</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-balance text-navy-950 sm:text-4xl lg:text-5xl">
            Different teams. The same need for evidence.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            CPGist adapts to the questions each role asks — from a founder tracking their first
            retail wins to a consultant preparing a category review.
          </p>
          <nav aria-label="Audiences" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-600"
                data-testid={`solutions-anchor-${a.id}`}
              >
                {a.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="bg-page pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.03}>
              <section
                id={a.id}
                aria-labelledby={`${a.id}-heading`}
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10"
              >
                <h2 id={`${a.id}-heading`} className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
                  {a.label}
                </h2>
                <p className="mt-2 text-lg font-medium text-navy-700">{a.headline}</p>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">{a.description}</p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                  {a.points.map((p) => (
                    <li key={p} className="rounded-lg bg-ice-100/70 p-4 text-sm leading-relaxed text-navy-950">
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs leading-relaxed text-slate-500">
                  CPGist works with the data you can share. It doesn't replace your existing data
                  providers, and outcomes depend on the quality and coverage of the underlying data.
                </p>
                <CTARow
                  className="mt-6"
                  primary={{ label: "Request a Demo", to: "/contact", testid: `solutions-cta-${a.id}-demo` }}
                  secondary={{ label: "Explore the Platform", to: "/platform", testid: `solutions-cta-${a.id}-platform` }}
                />
              </section>
            </Reveal>
          ))}
        </div>
      </div>

      <section className="bg-navy-950 py-16 sm:py-20" aria-labelledby="solutions-final-cta-heading">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 id="solutions-final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tell us which questions you need answered.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ice-300 sm:text-lg">
            We'll show you how CPGist would approach them with your data.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/contact"
              className={buttonVariants({ size: "lg", className: "bg-white text-navy-950 hover:bg-ice-100" })}
              data-testid="solutions-final-cta-request-demo"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
