import { Link } from "react-router-dom";
import { useConsent } from "@/lib/consent";
import { Logo } from "@/components/site/Logo";

interface FooterLink {
  label: string;
  to: string;
  testid: string;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Executive Dashboard", to: "/platform#executive-dashboard", testid: "footer-link-executive-dashboard" },
      { label: "Sales & Category Intelligence", to: "/platform#sales-category", testid: "footer-link-sales-category" },
      { label: "Brand & Product Analytics", to: "/platform#brand-product", testid: "footer-link-brand-product" },
      { label: "Retail & Distribution", to: "/platform#retail-distribution", testid: "footer-link-retail-distribution" },
      { label: "Pricing & Promotion", to: "/platform#pricing-promotion", testid: "footer-link-pricing-promotion" },
      { label: "AI Analyst", to: "/platform#ai-analyst", testid: "footer-link-ai-analyst" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "For Emerging Brands", to: "/solutions#emerging-brands", testid: "footer-link-emerging-brands" },
      { label: "For Retail & Sales Teams", to: "/solutions#retail-sales-teams", testid: "footer-link-retail-sales-teams" },
      { label: "For Category Analysts", to: "/solutions#category-analysts", testid: "footer-link-category-analysts" },
      { label: "For Consultants", to: "/solutions#consultants", testid: "footer-link-consultants" },
    ],
  },
  {
    title: "Company & Trust",
    links: [
      { label: "About CPGist", to: "/about", testid: "footer-link-about" },
      { label: "How It Works", to: "/how-it-works", testid: "footer-link-how-it-works" },
      { label: "Request a Demo", to: "/contact", testid: "footer-link-contact" },
      { label: "Sign In", to: "/signin", testid: "footer-link-sign-in" },
    ],
  },
  {
    title: "Legal & Compliance",
    links: [
      { label: "Privacy Policy", to: "/privacy", testid: "footer-link-privacy" },
      { label: "Terms of Service", to: "/terms", testid: "footer-link-terms" },
      { label: "Refund Policy", to: "/refund-policy", testid: "footer-link-refund-policy" },
      { label: "Cookie Policy", to: "/cookies", testid: "footer-link-cookies" },
      { label: "Data Deletion Request", to: "/data-deletion", testid: "footer-link-data-deletion" },
    ],
  },
];

export function Footer() {
  const { openPreferences } = useConsent();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-ice-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="inline-flex rounded-xl bg-white p-2 shadow-sm">
              <Logo size={44} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ice-300/90">
              AI-powered CPG intelligence. From CPG data to confident decisions.
            </p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-ice-300/70">
              CPGist is an early-access product. All product figures shown on this
              site are illustrative sample data, not customer results.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="space-y-3">
              <h2 className="text-sm font-semibold text-white">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-ice-300/90 transition-colors hover:text-white" data-testid={link.testid}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.title === "Legal & Compliance" && (
                  <li>
                    <button
                      type="button"
                      onClick={openPreferences}
                      className="text-sm text-ice-300/90 underline-offset-2 transition-colors hover:text-white hover:underline"
                      data-testid="footer-button-cookie-settings"
                    >
                      Cookie Settings
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ice-300/70">&copy; {year} CPGist. All rights reserved.</p>
          <p className="text-xs text-ice-300/70">
            Business identity, contact, and registration details are configured
            before launch — see the legal pages for status.
          </p>
        </div>
      </div>
    </footer>
  );
}
