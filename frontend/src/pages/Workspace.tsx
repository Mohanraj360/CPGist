import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, LogOut } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useSession, type User } from "@/lib/session";
import { usePageMeta } from "@/lib/seo";
import InteractiveProductPreview from "@/components/preview/InteractiveProductPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/site/Sections";

// Mirrors WorkspaceOverview in backend/routers/workspace.py.
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

  return (
    <div className="bg-page">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Account header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {picture ? (
              <img src={picture} alt="" width={48} height={48} className="size-12 rounded-full border border-slate-200" />
            ) : (
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-ice-100 text-lg font-bold text-navy-800">
                {(displayName || displayEmail || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <Eyebrow>Workspace</Eyebrow>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-navy-950 sm:text-2xl" data-testid="workspace-greeting">
                {displayName ? `Welcome back, ${displayName.split(" ")[0]}.` : "Welcome back."}
              </h1>
              <p className="text-sm text-slate-500" data-testid="workspace-account-email">
                {displayEmail}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut} data-testid="workspace-sign-out">
            <LogOut aria-hidden="true" className="mr-2 size-4" />
            Sign out
          </Button>
        </header>

        {/* Dataset status — honest about what's connected */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5" role="note" data-testid="workspace-dataset-notice">
          <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            You're viewing CPGist's illustrative sample dataset
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            {isLoading
              ? "Loading your workspace details…"
              : isError
                ? "Your workspace details couldn't be loaded just now, but the analytics below still run on the sample dataset."
                : data?.dataset_label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            No customer data sources are connected to this account yet, so these figures are
            synthetic and do not represent real market performance. The AI Analyst below is live
            and reasons only over the data shown.
          </p>
          {data?.pending_capabilities?.length ? (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-amber-800">Coming next</p>
              <ul className="mt-2 flex flex-wrap gap-2" data-testid="workspace-pending-capabilities">
                {data.pending_capabilities.map((c) => (
                  <li key={c}>
                    <Badge variant="outline" className="border-amber-300 bg-white/60 text-amber-800">
                      {c}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {/* Analytics */}
        <section aria-labelledby="workspace-analytics-heading" className="mt-6">
          <h2 id="workspace-analytics-heading" className="sr-only">
            Analytics overview
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <InteractiveProductPreview variant="full" />
          </div>
        </section>
      </div>
    </div>
  );
}
