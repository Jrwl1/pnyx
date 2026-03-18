/* WHAT IT DO? Updates document head metadata for public routes without requiring a separate routing layer. */

import { useEffect, type ReactElement } from "react";

const SITE_NAME = "PNYX";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const resolveSiteOrigin = (): string | null => {
  const configuredOrigin = (import.meta.env.VITE_SITE_ORIGIN ?? "").trim();
  if (configuredOrigin) {
    return trimTrailingSlash(configuredOrigin);
  }
  if (typeof window !== "undefined" && window.location.origin) {
    return trimTrailingSlash(window.location.origin);
  }
  return null;
};

const ensureMetaTag = (attribute: "name" | "property", key: string): HTMLMetaElement => {
  const existing = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (existing instanceof HTMLMetaElement) {
    return existing;
  }
  const meta = document.createElement("meta");
  meta.setAttribute(attribute, key);
  document.head.appendChild(meta);
  return meta;
};

const ensureCanonicalLink = (): HTMLLinkElement => {
  const existing = document.head.querySelector('link[rel="canonical"]');
  if (existing instanceof HTMLLinkElement) {
    return existing;
  }
  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  document.head.appendChild(link);
  return link;
};

export const PageMeta = ({
  title,
  description,
  path
}: {
  title: string;
  description: string;
  path?: string;
}): ReactElement | null => {
  useEffect(() => {
    document.title = title;

    ensureMetaTag("name", "description").setAttribute("content", description);
    ensureMetaTag("property", "og:title").setAttribute("content", title);
    ensureMetaTag("property", "og:description").setAttribute("content", description);
    ensureMetaTag("property", "og:type").setAttribute("content", "website");
    ensureMetaTag("property", "og:site_name").setAttribute("content", SITE_NAME);
    ensureMetaTag("name", "twitter:title").setAttribute("content", title);
    ensureMetaTag("name", "twitter:description").setAttribute("content", description);
    ensureMetaTag("name", "twitter:card").setAttribute("content", "summary");

    const origin = resolveSiteOrigin();
    if (origin && path) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const absoluteUrl = `${origin}${normalizedPath}`;
      ensureCanonicalLink().setAttribute("href", absoluteUrl);
      ensureMetaTag("property", "og:url").setAttribute("content", absoluteUrl);
    }
  }, [description, path, title]);

  return null;
};
