type CachedAnalysis = {
  expiresAt: number;
  value: Record<string, unknown>;
};

const successfulAnalyses = new Map<string, CachedAnalysis>();
const inFlightAnalyses = new Map<string, Promise<Record<string, unknown>>>();

export function analysisCacheKey(input: {
  query: string;
  workflow?: string;
  brand?: string;
  category?: string;
  period?: string;
  filters?: unknown;
}) {
  return JSON.stringify({
    query: input.query.trim().toLowerCase(),
    workflow: input.workflow ?? "",
    brand: input.brand ?? "",
    category: input.category ?? "",
    period: input.period ?? "",
    filters: input.filters ?? null,
  });
}

export function getCachedAnalysis(key: string) {
  const cached = successfulAnalyses.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    successfulAnalyses.delete(key);
    return undefined;
  }
  return cached.value;
}

export function getInFlightAnalysis(key: string) {
  return inFlightAnalyses.get(key);
}

export function setInFlightAnalysis(key: string, promise: Promise<Record<string, unknown>>) {
  inFlightAnalyses.set(key, promise);
  promise.finally(() => inFlightAnalyses.delete(key)).catch(() => undefined);
}

export function cacheAnalysis(key: string, value: Record<string, unknown>) {
  successfulAnalyses.set(key, { expiresAt: Date.now() + 10 * 60 * 1000, value });
}
