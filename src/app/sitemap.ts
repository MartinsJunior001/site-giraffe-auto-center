import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return process.env.NEXT_PUBLIC_INDEXABLE === "true" && siteUrl ? [{ url: siteUrl, priority: 1 }] : [];
}
