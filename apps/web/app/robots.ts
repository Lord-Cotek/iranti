import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://iranti.cotek.app";
  return {
    // The product, executor and recipient areas are never indexed.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/executor/", "/r/"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
