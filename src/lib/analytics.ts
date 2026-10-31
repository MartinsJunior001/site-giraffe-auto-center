type AnalyticsWindow = Window & { dataLayer?: Array<Record<string, string | number>> };

export function trackEvent(event: string, details: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  (window as AnalyticsWindow).dataLayer?.push({ event, ...details });
}
