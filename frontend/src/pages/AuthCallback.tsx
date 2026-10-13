import { Link } from "react-router-dom";
import { Logo } from "@/components/site/Logo";
import { buttonVariants } from "@/components/ui/button";

/** Fallback UI for an incomplete sign-in flow; OAuth is completed by the backend. */
export default function AuthCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="mt-6 text-xl font-bold text-navy-950">Continue to CPGist</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Sign-in is securely completed by CPGist. Please start again from the sign-in page.
        </p>
        <Link to="/signin" className={buttonVariants({ className: "mt-6" })}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
