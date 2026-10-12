import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { usePageMeta } from "@/lib/seo";

export default function NotFound() {
  usePageMeta({
    title: "Page not found | CPGist",
    description: "The page you're looking for doesn't exist. Explore CPGist's platform, solutions, and contact options.",
    path: "/404",
  });

  return (
    <div className="bg-page">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-navy-600">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">This page doesn't exist.</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
          The link may be outdated or mistyped. Try the platform overview, or get in touch with
          the CPGist team.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/" className={buttonVariants({ size: "lg" })} data-testid="notfound-link-home">
            Back to home
          </Link>
          <Link to="/contact" className={buttonVariants({ variant: "outline", size: "lg" })} data-testid="notfound-link-contact">
            Contact CPGist
          </Link>
        </div>
      </div>
    </div>
  );
}
