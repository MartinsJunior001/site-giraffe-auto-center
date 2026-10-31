import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  const publicSite = process.env.NEXT_PUBLIC_INDEXABLE === "true" && !!siteUrl;
  return {
    rules: { userAgent: "*", ...(publicSite ? { allow: "/" } : { disallow: "/" }) },
    ...(publicSite ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
