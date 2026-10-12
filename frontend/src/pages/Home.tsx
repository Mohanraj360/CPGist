import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BarChart3,
  Compass,
  Database,
  HelpCircle,
  Network,
  Package,
  Sparkles,
  Store,
  Tags,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CTARow, Eyebrow, MockWindow, Reveal, SectionHeader } from "@/components/site/Sections";
import InteractiveProductPreview from "@/components/preview/InteractiveProductPreview";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  { icon: BarChart3, label: "CPG Performance Analytics" },
  { icon: Store, label: "Retail & Distribution Intelligence" },
  { icon: Tags, label: "Pricing & Promotion Analysis" },
  { icon: Sparkles, label: "AI-Assisted Business Insights" },
];

const PROBLEM_CARDS = [
  {
    icon: Database,
    title: "Fragmented Data",
    body: "Bring supported business metrics into a more connected analytical workspace.",
  },
  {
    icon: HelpCircle,
    title: "Difficult Questions",
    body: "Investigate performance changes across brands, products, retailers, pricing, and promotions.",
  },
  {
    icon: Timer,
    title: "Manual Analysis",
    body: "Use natural-language questions and structured analytical outputs to explore the data faster.",
  },
];

const PLATFORM_CARDS = [
  {
    icon: TrendingUp,
    title: "Sales & Category Intelligence",
    body: "Track sales, units, growth, and category trends.",
    to: "/platform#sales-category",
    testid: "home-platform-card-sales",
  },
  {
    icon: Package,
    title: "Brand & Product Analytics",
    body: "Compare brand and SKU performance and investigate product-level changes.",
    to: "/platform#brand-product",
    testid: "home-platform-card-brand",
  },
  {
    icon: Store,
    title: "Retail & Distribution Analytics",
    body: "Explore retailer performance, distribution signals, and potential availability gaps where the required data exists.",
    to: "/platform#retail-distribution",
    testid: "home-platform-card-retail",
  },
  {
    icon: Tags,
    title: "Pricing & Promotion Intelligence",
    body: "Analyze pricing trends, promotion performance, baseline comparisons, and supported trade-spend metrics.",
    to: "/platform#pricing-promotion",
    testid: "home-platform-card-pricing",
  },
  {
    icon: Sparkles,
    title: "AI Analyst & Executive Reporting",
    body: "Ask questions about available data, review evidence-grounded findings, and organize results into executive-ready reports.",
    to: "/platform#ai-analyst",
    testid: "home-platform-card-ai",
  },
];

const PRINCIPLES = [
  {
    icon: Network,
    title: "Connected Context",
    body: "Explore relationships across available business dimensions.",
  },
  {
    icon: Sparkles,
    title: "AI-Assisted Investigation",
    body: "Ask business questions in natural language.",
  },
  {
    icon: BadgeCheck,
    title: "Evidence-Aware Analysis",
    body: "Distinguish observed results, estimates, projections, and missing data.",
  },
  {
    icon: Compass,
    title: "Decision Support",
    body: "Identify follow-up questions and potential next steps without pretending that every explanation is proven.",
  },
];

const AUDIENCES = [
  {
    title: "Emerging CPG Brands",
    body: "Understand business performance and explore potential growth opportunities using the data available to the business.",
    to: "/solutions#emerging-brands",
    testid: "home-audience-emerging",
  },
  {
    title: "Retail and Sales Teams",
    body: "Investigate retailer performance, product trends, and potential distribution gaps.",
    to: "/solutions#retail-sales-teams",
    testid: "home-audience-retail",
  },
  {
    title: "Category and Insights Analysts",
    body: "Explore category and brand changes and prepare structured analytical reviews.",
    to: "/solutions#category-analysts",
    testid: "home-audience-analysts",
  },
  {
    title: "Consultants and Business Advisors",
    body: "Support client discussions with clear performance analysis, evidence-aware insights, and executive-ready summaries.",
    to: "/solutions#consultants",
    testid: "home-audience-consultants",
  },
];

const STEPS = [
  {
    title: "Bring Your Data",
    body: "Upload a supported dataset.",
  },
  {
    title: "Explore Performance",
    body: "Review available metrics and business dimensions.",
  },
  {
    title: "Ask Better Questions",
    body: "Use AI-assisted analysis to investigate changes.",
  },
  {
    title: "Make Informed Decisions",
    body: "Use the findings and limitations to determine what to investigate or do next.",
  },
];

export default function Home() {
  usePageMeta({
    title: "CPGist | AI-Powered CPG & Retail Analytics",
    description:
      "Explore CPG sales, brand, product, retailer, pricing, distribution, and promotion performance with an AI-powered analytics platform designed to turn business data into clearer decisions.",
    path: "/",
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-page">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-8">
          <div>
            <Eyebrow>AI-powered CPG intelligence</Eyebrow>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.12] tracking-tight text-balance text-navy-950 sm:text-4xl lg:text-5xl">
              Your data has the answers. Let&rsquo;s find them.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Understand what&rsquo;s changing across your CPG business. Explore sales, product,
              retailer, pricing, distribution, and promotion performance in one analytical
              workspace — and use AI-assisted analysis to investigate what the numbers mean.
            </p>
            <CTARow
              className="mt-8"
              primary={{ label: "Explore the Platform", to: "/platform", testid: "hero-cta-explore-platform" }}
              secondary={{ label: "Request a Demo", to: "/contact", testid: "hero-cta-request-demo" }}
            />
            <p className="mt-5 text-sm text-slate-500">Built for CPG brands, retail teams, analysts, and consultants.</p>
          </div>

          <Reveal>
            <MockWindow title="CPGist — Executive overview (sample data)" className="shadow-md">
              <div className="p-4">
                <InteractiveProductPreview variant="hero" />
              </div>
            </MockWindow>
          </Reveal>
        </div>
      </section>

      {/* Capability strip — no invented logos or testimonials */}
      <section aria-labelledby="capabilities-heading" className="border-y border-slate-200 bg-white">
        <h2 id="capabilities-heading" className="sr-only">
          Product capabilities
        </h2>
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {CAPABILITIES.map((cap) => (
            <div key={cap.label} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ice-100 text-navy-800">
                <cap.icon aria-hidden="true" className="size-5" />
              </span>
              <p className="text-sm font-semibold text-navy-950">{cap.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section aria-labelledby="problem-heading" className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="problem-heading"
            eyebrow="The challenge"
            title="Growth is complicated. Understanding it shouldn't be."
            description="CPG teams often work across multiple reports, metrics, and datasets to understand why performance changes. CPGist is designed to make that investigation more connected and accessible."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PROBLEM_CARDS.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.05}>
                <Card className="h-full transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-6">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-ice-100 text-navy-800">
                      <card.icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-navy-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Platform overview */}
      <section aria-labelledby="platform-overview-heading" className="bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="platform-overview-heading"
            eyebrow="Platform"
            title="One workspace. Multiple perspectives on growth."
            description="Five connected modules cover the questions CPG teams ask most — from category trends to promotion effectiveness."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_CARDS.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.05}>
                <Card className="h-full transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex h-full flex-col p-6">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-ice-100 text-navy-800">
                      <card.icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-navy-950">{card.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{card.body}</p>
                    <Link to={card.to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 underline-offset-2 hover:underline" data-testid={card.testid}>
                      Learn more
                      <span aria-hidden="true">→</span>
                    </Link>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
            <Reveal delay={0.25}>
              <Card className="h-full bg-navy-950">
                <CardContent className="flex h-full flex-col justify-between p-6 text-white">
                  <div>
                    <Users aria-hidden="true" className="size-8 text-ice-300" />
                    <h3 className="mt-4 text-lg font-semibold">See how the modules work together</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ice-300">
                      A guided tour of the analytical workflow, from data upload to executive-ready
                      reports.
                    </p>
                  </div>
                  <Link to="/how-it-works" className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-6 w-fit bg-ice-100 text-navy-800 hover:bg-ice-300" })} data-testid="home-platform-card-how">
                    Explore the workflow
                  </Link>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Interactive preview */}
      <section aria-labelledby="preview-heading" className="border-y border-slate-200 bg-page py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="preview-heading"
            eyebrow="Interactive product preview"
            title="See the workspace for yourself."
            description="Filter the sample data by time period, brand, and retailer — every KPI, chart, and table recalculates from the same dataset. Ask the AI Analyst your own question for a live, evidence-aware analysis of that data. All figures are illustrative."
          />
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <InteractiveProductPreview variant="full" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Differentiation */}
      <section aria-labelledby="differentiation-heading" className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="differentiation-heading"
            eyebrow="Why CPGist"
            title="Not just what happened. What should you investigate next?"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05}>
                <div className="h-full rounded-xl border border-slate-200 bg-white p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-ice-100 text-navy-800">
                    <p.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-navy-950">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 rounded-xl bg-navy-950 p-6 sm:p-8">
            <p className="text-base leading-relaxed text-ice-300 sm:text-lg">
              CPGist supports human decision-making — it doesn&rsquo;t replace business judgment.
              Findings come with evidence, assumptions, and limitations, so your team decides what
              to investigate and what to do next.
            </p>
          </div>
        </div>
      </section>

      {/* Audience */}
      <section aria-labelledby="audience-heading" className="bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader id="audience-heading" eyebrow="Who it's for" title="Built for the people behind CPG growth." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.05}>
                <Card className="h-full transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex h-full flex-col p-6">
                    <h3 className="text-base font-semibold text-navy-950">{a.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{a.body}</p>
                    <Link to={a.to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 underline-offset-2 hover:underline" data-testid={a.testid}>
                      Explore solutions
                      <span aria-hidden="true">→</span>
                    </Link>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="how-heading"
            eyebrow="How it works"
            title="From data to decisions in four steps."
          />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.05}>
                <li className="h-full rounded-xl border border-slate-200 bg-white p-6">
                  <span className="flex size-9 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-navy-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <div className={cn("mt-8")}>
            <Link to="/how-it-works" className={buttonVariants({ variant: "outline" })} data-testid="home-how-link">
              See the full workflow
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy-950 py-16 sm:py-20" aria-labelledby="final-cta-heading">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
            Ready to see your CPG data differently?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ice-300 sm:text-lg">
            Explore a more connected approach to understanding sales, retail performance, pricing,
            and promotions.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/contact"
              className={buttonVariants({ size: "lg", className: "bg-white text-navy-950 hover:bg-ice-100" })}
              data-testid="home-final-cta-request-demo"
            >
              Request a Demo
            </Link>
            <Link
              to="/platform"
              className={buttonVariants({ variant: "outline", size: "lg", className: "border-ice-300/40 bg-transparent text-white hover:bg-white/10 hover:text-white" })}
              data-testid="home-final-cta-explore-platform"
            >
              Explore the Platform
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
