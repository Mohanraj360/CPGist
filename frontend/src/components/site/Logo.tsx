import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * CPGist brand logo (user-supplied badge: orange C + bar-chart motif inside a
 * purple/orange ring). Rendered from a local, optimized WebP asset.
 */
export function Logo({ className, size = 38 }: { className?: string; size?: number }) {
  return (
    <Link
      to="/"
      aria-label="CPGist — home"
      data-testid="logo-home-link"
      className={cn(
        "inline-flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600",
        className,
      )}
    >
      <img
        src="/assets/cpgist-logo.webp"
        alt="CPGist logo — Insights for a Smarter Tomorrow"
        width={size}
        height={size}
        className="rounded-full"
        decoding="async"
      />
    </Link>
  );
}
