import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Database, Info, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useSession, type User } from "@/lib/session";
import { usePageMeta } from "@/lib/seo";
import InteractiveProductPreview from "@/components/preview/InteractiveProductPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/site/Sections";

interface WorkspaceOverview {
  user: User;
  dataset_label: string;
  dataset_is_sample: boolean;
  connected_sources: string[];
  pending_capabilities: string[];
  generated_at: string;
}

export default function Workspace() {
  usePageMeta({
    title: "Workspace | CPGist",
    description: "Your CPGist analytics workspace — executive KPIs, trends, retailer performance, and the AI Analyst.",
    path: "/workspace",
  });

  const navigate = useNavigate();
  const { user, endSession } = useSession();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspace", "overview"],
    queryFn: () => apiGet<WorkspaceOverview>("/workspace/overview"),
    retry: false,
  });

  const signOut = async () => {
    await endSession();
    toast.success("You've been signed out.");
    navigate("/", { replace: true });
  };

  const displayName = data?.user.name ?? user?.name ?? "";
  const displayEmail = data?.user.email ?? user?.email ?? "";
  const picture = data?.user.picture ?? user?.picture ?? null;
  const connectedCount = data?.connected_sources?.length ?? 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-ice-100/70 via-slate-50 to-slate-100/70">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>CPGIST INTELLIGENCE</Eyebrow>
            <p className="mt-1 text-sm text-slate-500">Your retail performance, brought into focus.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Workspace session active
          </div>
        </div>

        <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-ice-100/80 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {picture ? (
                <img src={picture} alt="" width={60} height={60} className="size-14 rounded-2xl border border-slate-200 object-cover shadow-sm sm:size-16" />
              ) : (
                <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-navy-950 text-xl font-bold text-white shadow-sm sm:size-16">
                  {(displayName || displayEmail || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <Eyebrow>YOUR WORKSPACE</Eyebrow>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl" data-testid="workspace-greeting">
                  {displayName ? `Welcome back, ${displayName.split(" ")[0]}.` : "Welcome back."}
                </h1>
                <p className="mt-1 truncate text-sm text-slate-500" data-testid="workspace-account-email">{displayEmail}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button onClick={() => window.location.assign("/api/auth/ai-analyst")} className="rounded-xl bg-navy-950 text-white hover:bg-navy-800" data-testid="workspace-open-ai-analyst">
                <Sparkles aria-hidden="true" className="mr-2 size-4" />
                Open AI Analyst
                <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
              </Button>
              <Button variant="outline" onClick={signOut} className="rounded-xl bg-white" data-testid="workspace-sign-out">
                <LogOut aria-hidden="true" className="mr-2 size-4" />
                Sign out
              </Button>
            </div>
          </div>
          <div className="relative mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-navy-800 shadow-sm"><ShieldCheck className="size-5" /></span>
              <div><p className="text-xs text-slate-500">Account</p><p className="text-sm font-semibold text-slate-800">Signed in securely</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-navy-800 shadow-sm"><Database className="size-5" /></span>
              <div><p className="text-xs text-slate-500">Data connections</p><p className="text-sm font-semibold text-slate-800">{connectedCount ? `${connectedCount} connected` : "Not connected yet"}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-navy-800 shadow-sm"><Sparkles className="size-5" /></span>
              <div><p className="text-xs text-slate-500">Analytics</p><p className="text-sm font-semibold text-slate-800">CPG performance overview</p></div>
            </div>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 sm:p-6" role="note" data-testid="workspace-dataset-notice">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-800"><Info aria-hidden="true" className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-amber-950">Illustrative sample dataset</p>
                <Badge variant="outline" className="border-amber-300 bg-white/70 text-amber-800">Preview mode</Badge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-amber-900">
                {isLoading ? "Loading your workspace details…" : isError ? "Your workspace details couldn't be loaded just now, but the analytics below still run on the sample dataset." : data?.dataset_label}
              </p>
              <p className="mt-2 max-w-5xl text-sm leading-relaxed text-amber-900/90">
                No customer data sources are connected to this account yet. These figures are synthetic and do not represent real market performance. Use this preview to explore the experience before connecting your own data.
              </p>
              {data?.pending_capabilities?.length ? (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">On the roadmap</p>
                  <ul className="mt-2 flex flex-wrap gap-2" data-testid="workspace-pending-capabilities">
                    {data.pending_capabilities.map((c) => <li key={c}><Badge variant="outline" className="border-amber-300 bg-white/70 text-amber-900">{c}</Badge></li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section aria-labelledby="workspace-analytics-heading" className="mt-7">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>PERFORMANCE AT A GLANCE</Eyebrow>
              <h2 id="workspace-analytics-heading" className="mt-1 text-xl font-bold tracking-tight text-navy-950 sm:text-2xl">Executive overview</h2>
              <p className="mt-1 text-sm text-slate-500">Explore the sample retail dataset with interactive filters and charts.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><span className="size-2 rounded-full bg-amber-400" /> Sample data <ArrowUpRight className="size-3.5" /></span>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:rounded-3xl sm:p-6">
            <InteractiveProductPreview variant="full" />
          </div>
        </section>
        <footer className="mt-8 flex flex-col gap-1 border-t border-slate-200/80 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>CPGist · Your CPG AI Analyst</span>
          <span>Sample metrics are illustrative, not actual market results.</span>
        </footer>
      </div>
    </div>
  );
}
