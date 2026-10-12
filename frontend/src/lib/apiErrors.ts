import { ApiError } from "./api";

interface FastapiIssue {
  loc?: (string | number)[];
  msg?: string;
}

interface ErrorDetail {
  detail?: string | FastapiIssue[] | { code?: string; message?: string };
}

/** Human-readable message from an ApiError (FastAPI 422 lists, string details, structured bodies). */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(err instanceof ApiError)) return fallback;
  const detail = (err.body as ErrorDetail | null)?.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    const lastLoc = first.loc?.[first.loc.length - 1];
    const field = typeof lastLoc === "string" && lastLoc !== "body" ? lastLoc : null;
    const msg = first.msg ?? fallback;
    return field ? `${field}: ${msg}` : msg;
  }
  if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
    return detail.message;
  }
  return fallback;
}

/** The structured `code` from a non-2xx body, when present (e.g. "auth_not_configured"). */
export function apiErrorCode(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const detail = (err.body as ErrorDetail | null)?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail) && "code" in detail) {
    return typeof detail.code === "string" ? detail.code : null;
  }
  return null;
}

/** `integration_requirements` list from the sign-in endpoint's 503 body. */
export function apiIntegrationRequirements(err: unknown): string[] {
  if (!(err instanceof ApiError)) return [];
  const detail = (err.body as ErrorDetail | null)?.detail;
  if (
    detail &&
    typeof detail === "object" &&
    !Array.isArray(detail) &&
    "integration_requirements" in detail &&
    Array.isArray(detail.integration_requirements)
  ) {
    return detail.integration_requirements.filter((r): r is string => typeof r === "string");
  }
  return [];
}

/** Map FastAPI 422 issues to field names so forms can show per-field errors. */
export function apiFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const detail = (err.body as ErrorDetail | null)?.detail;
  if (!Array.isArray(detail)) return {};
  const out: Record<string, string> = {};
  for (const issue of detail) {
    const lastLoc = issue.loc?.[issue.loc.length - 1];
    if (typeof lastLoc === "string" && lastLoc !== "body" && issue.msg) {
      out[lastLoc] = issue.msg;
    }
  }
  return out;
}
