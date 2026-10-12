import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Small uppercase section label. */
export function Eyebrow({ children, tone = "light", className }: { children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <p
      className={cn(
        "text-xs font-bold uppercase tracking-[0.2em]",
        tone === "light" ? "text-navy-600" : "text-ice-300",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Standard section heading block with optional eyebrow + description. */
export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  tone = "light",
  align = "left",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className={cn(
          "mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl sm:mt-4",
          tone === "light" ? "text-navy-950" : "text-white",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", tone === "light" ? "text-slate-600" : "text-ice-300")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Primary + secondary CTA pair rendered as accessible links. */
export function CTARow({
  primary,
  secondary,
  align = "left",
  className,
}: {
  primary: { label: string; to: string; testid: string };
  secondary?: { label: string; to: string; testid: string };
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", align === "center" && "sm:justify-center", className)}>
      <Link to={primary.to} className={buttonVariants({ size: "lg" })} data-testid={primary.testid}>
        {primary.label}
      </Link>
      {secondary ? (
        <Link to={secondary.to} className={buttonVariants({ variant: "outline", size: "lg" })} data-testid={secondary.testid}>
          {secondary.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Browser-chrome frame used for every product mockup on the site. */
export function MockWindow({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-rose-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 truncate text-xs font-medium text-slate-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** Restrained scroll-reveal wrapper — disabled under prefers-reduced-motion. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Evidence-tag pill used in AI Analyst mockups. */
export type EvidenceKind = "observed" | "calculated" | "estimate" | "explanation" | "limitation";

const PILL_STYLES: Record<EvidenceKind, string> = {
  observed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  calculated: "border-sky-200 bg-sky-50 text-sky-700",
  estimate: "border-amber-200 bg-amber-50 text-amber-700",
  explanation: "border-amber-200 bg-amber-50 text-amber-700",
  limitation: "border-rose-200 bg-rose-50 text-rose-700",
};

const PILL_LABELS: Record<EvidenceKind, string> = {
  observed: "Observed metric",
  calculated: "Calculated comparison",
  estimate: "Estimate or projection",
  explanation: "Possible explanation",
  limitation: "Limitation or missing data",
};

export function EvidencePill({ kind, className }: { kind: EvidenceKind; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", PILL_STYLES[kind], className)}>
      {PILL_LABELS[kind]}
    </span>
  );
}
