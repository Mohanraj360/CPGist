import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/site/Sections";
import { usePageMeta } from "@/lib/seo";

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalPageContent {
  title: string;
  description: string;
  path: string;
  version: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}

/**
 * Shared layout for legal/policy pages: title, version + effective date +
 * draft-status badges, sticky table of contents, and structured sections.
 */
export function LegalPageLayout({ content, bannerSlot }: { content: LegalPageContent; bannerSlot?: ReactNode }) {
  const { title, description, path, version, effectiveDate, intro, sections } = content;
  usePageMeta({ title: `${title} | CPGist`, description, path });

  return (
    <div className="bg-page">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="max-w-3xl">
          <Eyebrow>Legal &amp; compliance</Eyebrow>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">{title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" data-testid="legal-version-badge">
              Version {version}
            </Badge>
            <Badge variant="outline">Effective {effectiveDate}</Badge>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700" data-testid="legal-review-status-badge">
              Draft — requires legal review before launch
            </Badge>
          </div>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800" role="note">
            This text is a working draft prepared for CPGist's launch. It must be reviewed by
            qualified legal counsel before production use, and it is not a guarantee of compliance
            with every applicable law. Business identity and contact details are marked as
            placeholders until they are configured.
          </div>
        </header>

        {bannerSlot}

        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="sticky top-24 hidden self-start lg:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
            <ul className="mt-3 space-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm text-slate-600 transition-colors hover:text-navy-800" data-testid={`legal-toc-${s.id}`}>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="max-w-3xl">
            <p className="text-base leading-relaxed text-slate-600">{intro}</p>
            <div className="mt-8 space-y-8">
              {sections.map((s) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-24">
                  <h2 id={`${s.id}-heading`} className="text-xl font-bold text-navy-950">
                    {s.heading}
                  </h2>
                  {s.paragraphs?.map((p) => (
                    <p key={p} className="mt-3 leading-relaxed text-slate-600">
                      {p}
                    </p>
                  ))}
                  {s.bullets && (
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-600">
                      {s.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
