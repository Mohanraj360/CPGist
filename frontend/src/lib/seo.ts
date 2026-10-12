import { useEffect } from "react";

// The public origin this site is served from — used for canonical/OG URLs.
export const SITE_ORIGIN = "https://cpg-decision-hub.preview.emergentagent.com";

interface PageMeta {
  title: string;
  description: string;
  path: string;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-page metadata (title, description, canonical, Open Graph, Twitter).
 * Default tags live in index.html; each page refines them on mount.
 */
export function usePageMeta({ title, description, path }: PageMeta) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", `${SITE_ORIGIN}${path}`);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${SITE_ORIGIN}${path}`;
  }, [title, description, path]);
}
