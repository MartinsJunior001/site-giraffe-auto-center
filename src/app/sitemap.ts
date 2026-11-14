import type { MetadataRoute } from "next";
import { privacyPolicyComplete, privacyPolicyPath } from "@/content/privacy";
import { siteUrl } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "true" || !siteUrl) return [];
  return [{ url: siteUrl, priority: 1 }, ...(privacyPolicyComplete ? [{ url: `${siteUrl}${privacyPolicyPath}`, priority: 0.3 }] : [])];
}
