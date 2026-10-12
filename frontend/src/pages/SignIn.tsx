import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiErrors";
import { useSession, startGoogleAuth, type User } from "@/lib/session";
import { usePageMeta } from "@/lib/seo";
import { validateAuthForm } from "@/lib/validation";
import { Eyebrow } from "@/components/site/Sections";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

export default function SignIn() {
  usePageMeta({
    title: "Sign In | CPGist",
    description:
      "Sign in to your CPGist workspace with Google or an email and password to explore CPG sales, retail, pricing, and promotion analytics.",
    path: "/signin",
  });

  const navigate = useNavigate();
  const { user, isLoading, beginSession } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Already signed in → go straight to the workspace.
  useEffect(() => {
    if (!isLoading && user) navigate("/workspace", { replace: true });
  }, [isLoading, user, navigate]);

  const auth = useMutation({
    mutationFn: (payload: { mode: Mode }) =>
      payload.mode === "signin"
        ? apiPost<User>("/auth/signin", { email: email.trim().toLowerCase(), password })
        : apiPost<User>("/auth/signup", {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            accept_terms: acceptTerms,
          }),
    onSuccess: async (data) => {
      await beginSession();
      toast.success(`Welcome${data.name ? `, ${data.name.split(" ")[0]}` : ""}.`);
      navigate("/workspace", { replace: true });
    },
    onError: (err) => setFormError(apiErrorMessage(err, "We couldn't sign you in. Please try again.")),
  });

  const validate = (): boolean => {
    const next = validateAuthForm({ mode, name, email, password, acceptTerms });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.isPending) return;
    setFormError(null);
    if (!validate()) return;
    auth.mutate({ mode });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
  };

  return (
    <div className="bg-page">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Brand panel */}
        <div className="rounded-2xl bg-navy-950 p-8 text-white sm:p-10">
          <div className="inline-flex rounded-xl bg-white p-2">
            <Logo size={52} />
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Your data has the answers. Let&rsquo;s find them.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ice-300">
            Sign in to your CPGist workspace — from CPG data to confident decisions.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ice-300">
            <li className="flex gap-2"><span aria-hidden="true" className="text-ice-200">→</span> Executive KPIs, trends, and retailer performance in one view</li>
            <li className="flex gap-2"><span aria-hidden="true" className="text-ice-200">→</span> Ask the AI Analyst questions and see the supporting evidence</li>
            <li className="flex gap-2"><span aria-hidden="true" className="text-ice-200">→</span> Findings separated from estimates, hypotheses, and gaps</li>
          </ul>
          <div className="mt-8 rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm leading-relaxed text-ice-300">
              Early access: the workspace currently runs on CPGist&rsquo;s illustrative sample
              dataset. Connecting your own data is the next milestone.
            </p>
          </div>
        </div>

        {/* Auth form */}
        <div className="flex items-start">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <Eyebrow>{mode === "signin" ? "Sign in" : "Create account"}</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-950">
              {mode === "signin" ? "Sign in to CPGist" : "Create your CPGist account"}
            </h2>

            {/* Google — primary path */}
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              size="lg"
              onClick={startGoogleAuth}
              data-testid="signin-google-button"
            >
              <SiGoogle aria-hidden="true" size={16} className="mr-2" />
              Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3">
              <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">or use email</span>
              <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={onSubmit} noValidate aria-label={mode === "signin" ? "Sign in" : "Create account"} data-testid="signin-form">
              {formError && (
                <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="signin-form-error">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {mode === "signup" && (
                <div className="mb-4">
                  <Label htmlFor="signin-name">Full name</Label>
                  <Input
                    id="signin-name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "signin-name-error" : undefined}
                    className="mt-1.5"
                    data-testid="signin-name-input"
                  />
                  {errors.name && <p id="signin-name-error" role="alert" className="mt-1.5 text-xs text-rose-600">{errors.name}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "signin-email-error" : undefined}
                  className="mt-1.5"
                  data-testid="signin-email-input"
                />
                {errors.email && <p id="signin-email-error" role="alert" className="mt-1.5 text-xs text-rose-600">{errors.email}</p>}
              </div>

              <div className="mt-4">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "signin-password-error" : "signin-password-hint"}
                    className="pr-10"
                    data-testid="signin-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:text-navy-800"
                    data-testid="signin-password-toggle"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="signin-password-error" role="alert" className="mt-1.5 text-xs text-rose-600">{errors.password}</p>
                ) : mode === "signup" ? (
                  <p id="signin-password-hint" className="mt-1.5 text-xs text-slate-500">At least 8 characters.</p>
                ) : null}
              </div>

              {mode === "signup" && (
                <div className="mt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="signin-accept-terms"
                      checked={acceptTerms}
                      onCheckedChange={(c) => setAcceptTerms(c === true)}
                      aria-describedby={errors.acceptTerms ? "signin-terms-error" : undefined}
                      data-testid="signin-accept-terms"
                    />
                    <Label htmlFor="signin-accept-terms" className="text-sm font-normal leading-relaxed text-slate-600">
                      I agree to the{" "}
                      <Link to="/terms" className="font-medium text-navy-700 underline underline-offset-2" data-testid="signin-terms-link">Terms of Service</Link>{" "}
                      and the{" "}
                      <Link to="/privacy" className="font-medium text-navy-700 underline underline-offset-2" data-testid="signin-privacy-link">Privacy Policy</Link>.
                    </Label>
                  </div>
                  {errors.acceptTerms && <p id="signin-terms-error" role="alert" className="mt-1.5 text-xs text-rose-600">{errors.acceptTerms}</p>}
                </div>
              )}

              <Button type="submit" className="mt-6 w-full" size="lg" disabled={auth.isPending} data-testid="signin-submit-button">
                {auth.isPending ? (
                  <>
                    <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : (
                  <>
                    <LogIn aria-hidden="true" className="mr-2 size-4" />
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 flex flex-col gap-2 text-sm">
              {mode === "signin" ? (
                <p className="text-slate-600">
                  New to CPGist?{" "}
                  <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-navy-700 underline underline-offset-2" data-testid="signin-switch-to-signup">
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-slate-600">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("signin")} className="font-semibold text-navy-700 underline underline-offset-2" data-testid="signin-switch-to-signin">
                    Sign in
                  </button>
                </p>
              )}
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() =>
                    setFormError(
                      "Password reset by email isn't enabled yet (it needs an email provider configured). Use “Continue with Google”, or contact us to regain access.",
                    )
                  }
                  className="w-fit text-sm font-medium text-navy-700 underline underline-offset-2"
                  data-testid="signin-forgot-password"
                >
                  Forgot password?
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
