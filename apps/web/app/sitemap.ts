import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://iranti.cotek.app";
  return [{ url: `${site}/`, changeFrequency: "monthly", priority: 1 }];
}
