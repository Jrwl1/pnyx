import type { ResearchSourceTier } from "./watchlist.js";

export type ResearchSourceDocument = {
  sourceUrl: string;
  sourceTier: ResearchSourceTier;
  title: string;
  text: string;
  publishedAt: string | null;
  fetchedAt: string;
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
};

const cleanWhitespace = (value: string): string => decodeHtmlEntities(value).replace(/\s+/g, " ").trim();

const stripHtmlToText = (html: string): string => {
  return cleanWhitespace(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
};

const matchHtmlAttribute = (html: string, kind: "property" | "name", value: string): string | null => {
  const patterns = [
    new RegExp(`<meta[^>]+${kind}=["']${value}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${kind}=["']${value}["']`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanWhitespace(match[1]);
    }
  }
  return null;
};

const matchHtmlText = (html: string, tagName: string): string | null => {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? stripHtmlToText(match[1]) : null;
};

const toPublishedDate = (value: string | null): string | null => {
  const raw = value?.trim();
  const datePart = raw?.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/)?.[1];
  if (!datePart) {
    return null;
  }

  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isFinite(date.getTime())) {
    const normalizedDate = date.toISOString().slice(0, 10);
    return normalizedDate === datePart ? datePart : null;
  }
  return null;
};

const collectJsonText = (value: unknown, output: string[]): void => {
  if (typeof value === "string") {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonText(item, output);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectJsonText(item, output);
    }
  }
};

const parseJsonDocument = (responseText: string): { title: string | null; text: string; publishedAt: string | null } | null => {
  try {
    const payload = JSON.parse(responseText) as Record<string, unknown>;
    const strings: string[] = [];
    collectJsonText(payload, strings);
    const title = typeof payload.title === "string" ? payload.title : typeof payload.name === "string" ? payload.name : null;
    const publishedAt =
      typeof payload.publishedAt === "string"
        ? payload.publishedAt
        : typeof payload.datePublished === "string"
          ? payload.datePublished
          : typeof payload.date === "string"
            ? payload.date
            : null;
    return {
      title: title ? cleanWhitespace(title) : null,
      text: cleanWhitespace(strings.join(" ")),
      publishedAt
    };
  } catch {
    return null;
  }
};

export const documentFromResponseText = (input: {
  sourceUrl: string;
  sourceTier: ResearchSourceTier;
  responseText: string;
  fetchedAt: string;
  maxResponseBytes: number;
}): ResearchSourceDocument => {
  const truncated = input.responseText.slice(0, input.maxResponseBytes);
  const jsonDocument = parseJsonDocument(truncated);
  if (jsonDocument) {
    return {
      sourceUrl: input.sourceUrl,
      sourceTier: input.sourceTier,
      title: jsonDocument.title ?? input.sourceUrl,
      text: jsonDocument.text,
      publishedAt: toPublishedDate(jsonDocument.publishedAt),
      fetchedAt: input.fetchedAt
    };
  }

  const title =
    matchHtmlAttribute(truncated, "property", "og:title") ??
    matchHtmlAttribute(truncated, "name", "twitter:title") ??
    matchHtmlText(truncated, "title") ??
    matchHtmlText(truncated, "h1") ??
    input.sourceUrl;
  const publishedAt =
    matchHtmlAttribute(truncated, "property", "article:published_time") ??
    matchHtmlAttribute(truncated, "name", "date") ??
    matchHtmlAttribute(truncated, "property", "datePublished");

  return {
    sourceUrl: input.sourceUrl,
    sourceTier: input.sourceTier,
    title,
    text: stripHtmlToText(truncated),
    publishedAt: toPublishedDate(publishedAt),
    fetchedAt: input.fetchedAt
  };
};
