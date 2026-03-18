import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const publicDir = path.join(frontendDir, "public");

const rawOrigin = (process.env.VITE_SITE_ORIGIN ?? "https://pnyx.local").trim();
const siteOrigin = rawOrigin.replace(/\/+$/, "");

const publicRoutes = ["/", "/politicians", "/parties", "/promises", "/methodology"];

const robots = `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`;
const sitemapEntries = publicRoutes
  .map((route) => {
    const normalizedPath = route === "/" ? "" : route;
    return `  <url>\n    <loc>${siteOrigin}${normalizedPath}</loc>\n  </url>`;
  })
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "robots.txt"), robots, "utf8");
writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap, "utf8");
