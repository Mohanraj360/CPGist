import { Compass, Eye, FileCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow, Reveal, SectionHeader } from "@/components/site/Sections";
import { Logo } from "@/components/site/Logo";
import { usePageMeta } from "@/lib/seo";

const BELIEFS = [
  {
    icon: Eye,
    title: "Evidence before answers",
    body: "Useful AI should do more than generate answers. It should make the supporting evidence, assumptions, and limitations easier to understand.",
  },
  {
    icon: Compass,
    title: "Decision-oriented analysis",
    body: "Analysis exists to support decisions. Every view and response points to what a team might investigate or do next.",
  },
  {
    icon: FileCheck,
    title: "Connected context",
    body: "Isolated reports hide causes. CPGist connects relevant performance metrics so changes can be investigated across dimensions.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about limits",
    body: "We distinguish what the data shows from what still needs investigation — and we say when the data isn't there.",
  },
];

export default function About() {
  usePageMeta({
    title: "About CPGist | CPGist",
    description:
      "CPGist is building accessible, transparent CPG intelligence: connected performance metrics, accessible analysis, and AI that shows its evidence and limitations.",
    path: "/about",
  });

  return (
    <>
      <section className="bg-page">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow>About CPGist</Eyebrow>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-balance text-navy-950 sm:text-4xl lg:text-5xl">
                Making CPG intelligence more accessible and actionable.
              </h1>
            </div>
            <div className="hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
              <div className="inline-flex rounded-xl bg-white">
                <Logo size={96} />
              </div>
            </div>
          </div>

          <div className="mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            <p>
              CPGist is being built to help CPG professionals move beyond disconnected reports and
              investigate the business questions that matter.
            </p>
            <p>
              Our focus is to connect relevant performance metrics, make analytical exploration
              more accessible, and help teams distinguish what the data shows from what still needs
              investigation.
            </p>
            <p>
              We believe useful AI should do more than generate answers. It should make the
              supporting evidence, assumptions, and limitations easier to understand.
            </p>
            <p>
              Our goal is to make CPG analysis more connected, transparent, and decision-oriented.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="beliefs-heading" className="bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader id="beliefs-heading" eyebrow="What we believe" title="Principles that shape the product." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {BELIEFS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.05}>
                <div className="h-full rounded-xl border border-slate-200 p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-ice-100 text-navy-800">
                    <b.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-navy-950">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="status-heading" className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="status-heading"
            eyebrow="Where things stand"
            title="An honest status page for the product."
            description="CPGist is in early access. We'd rather show you exactly where the product stands than imply more than is true."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-navy-950">What's real today</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li className="flex gap-2"><span aria-hidden="true" className="text-emerald-600">✓</span> Accounts and sign-in via Google or email and password, with a workspace behind them.</li>
                <li className="flex gap-2"><span aria-hidden="true" className="text-emerald-600">✓</span> A live AI Analyst that answers questions and shows its evidence and limitations.</li>
                <li className="flex gap-2"><span aria-hidden="true" className="text-emerald-600">✓</span> A working contact and demo-request flow that stores submissions server-side.</li>
                <li className="flex gap-2"><span aria-hidden="true" className="text-emerald-600">✓</span> Cookie consent with granular, changeable preferences.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-navy-950">What's not here yet</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li className="flex gap-2"><span aria-hidden="true" className="text-slate-400">•</span> Connecting your own data — the workspace runs on CPGist's illustrative sample dataset for now.</li>
                <li className="flex gap-2"><span aria-hidden="true" className="text-slate-400">•</span> Password reset by email, which needs an email provider configured.</li>
                <li className="flex gap-2"><span aria-hidden="true" className="text-slate-400">•</span> Paid plans — no payments are accepted today, so no refunds apply yet either.</li>
                <li className="flex gap-2"><span aria-hidden="true" className="text-slate-400">•</span> Customer references — we don't publish invented logos, testimonials, or statistics.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-ice-100/60 p-6" role="note">
            <h3 className="text-base font-semibold text-navy-950">Business identity (configuration placeholders)</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Legal entity name, registration details, business address, contact emails, and tax
              information are configured before launch and are not invented here. Where a policy
              needs these details, they appear as clearly marked placeholders pending legal review.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-navy-950 py-16 sm:py-20" aria-labelledby="about-final-cta-heading">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 id="about-final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Let's build clearer CPG analysis together.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/contact"
              className={buttonVariants({ size: "lg", className: "bg-white text-navy-950 hover:bg-ice-100" })}
              data-testid="about-cta-request-demo"
            >
              Request a Demo
            </Link>
            <Link
              to="/platform"
              className={buttonVariants({ variant: "outline", size: "lg", className: "border-ice-300/40 bg-transparent text-white hover:bg-white/10 hover:text-white" })}
              data-testid="about-cta-explore-platform"
            >
              Explore the Platform
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
