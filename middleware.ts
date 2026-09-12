import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Phase 6: without this, a signed-in user's session cookie would expire
// mid-conversation with no refresh path — Supabase access tokens are
// short-lived, and refreshing them is normally the client SDK's job, but
// Server Components/Route Handlers can't write response cookies themselves
// on every request the way middleware can. This runs on every request,
// refreshes the session if needed, and re-issues the cookies on the
// response so lib/supabase.ts's server client always sees a current token.
//
// Also does the actual "you must be signed in" gate: unauthenticated page
// requests redirect to /login; unauthenticated API requests get a 401 JSON
// body instead of a redirect (a fetch() call following a 302 to an HTML
// login page is a confusing failure mode for a JSON API consumer like
// ChatUI.tsx's fetch("/api/agent") call).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Deliberately getUser() (validates the token against Supabase), not
  // getSession() (only reads the cookie) -- getSession() would happily
  // return a "valid-looking" session from a stale/tampered cookie without
  // checking it against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // /api/cron/* has no end-user session (Vercel Cron triggers it directly)
  // and checks its own CRON_SECRET bearer token instead — see
  // app/api/cron/detect-anomalies/route.ts. Everything else still goes
  // through the normal signed-in-user gate below.
  const isPublicPath =
    pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/api/cron");

  if (!user && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized — please sign in." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, images, and favicon — this
    // intentionally includes /api/* so agent/forecast/feedback routes are
    // covered by the same gate rather than re-implementing auth checks in
    // each route handler.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
