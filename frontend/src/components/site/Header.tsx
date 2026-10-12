import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/Logo";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Platform", to: "/platform" },
  { label: "Solutions", to: "/solutions" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
] as const;

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md text-sm font-medium transition-colors hover:text-navy-800",
    isActive ? "text-navy-800 font-semibold" : "text-slate-600",
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, endSession } = useSession();
  const navigate = useNavigate();

  const signOut = async () => {
    setOpen(false);
    await endSession();
    toast.success("You've been signed out.");
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link to="/workspace" className={buttonVariants({ variant: "ghost", size: "sm" })} data-testid="nav-workspace">
                <LayoutDashboard aria-hidden="true" className="mr-1.5 size-4" />
                Workspace
              </Link>
              <Button variant="outline" size="sm" onClick={signOut} data-testid="nav-sign-out">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/signin" className={buttonVariants({ variant: "ghost", size: "sm" })} data-testid="nav-sign-in">
                Sign In
              </Link>
              <Link to="/contact" className={buttonVariants({ size: "sm" })} data-testid="nav-cta-request-demo">
                Request a Demo
              </Link>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Open navigation menu" data-testid="nav-mobile-toggle" className="lg:hidden" />
            }
          >
            <Menu className="size-5" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetTitle>
              <span className="sr-only">CPGist navigation</span>
            </SheetTitle>
            <SheetDescription>
              <span className="sr-only">Primary navigation links for the CPGist website.</span>
            </SheetDescription>
            <nav aria-label="Mobile" className="mt-2 flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                      isActive ? "bg-ice-100 text-navy-800" : "text-slate-700 hover:bg-slate-50",
                    )
                  }
                  data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/workspace" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })} data-testid="mobile-nav-workspace">
                    <LayoutDashboard aria-hidden="true" className="mr-2 size-4" />
                    Workspace
                  </Link>
                  <Button variant="outline" size="lg" onClick={signOut} data-testid="mobile-nav-sign-out">
                    <LogOut aria-hidden="true" className="mr-2 size-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/contact" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })} data-testid="mobile-nav-cta-request-demo">
                    Request a Demo
                  </Link>
                  <Link to="/signin" onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline", size: "lg" })} data-testid="mobile-nav-sign-in">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
