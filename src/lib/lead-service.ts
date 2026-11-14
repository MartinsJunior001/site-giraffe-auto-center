import { revenueOptions, roleOptions } from "@/content/diagnosis";

export type LeadPayload = {
  role: string; revenue: string;
  name: string; email: string; phone: string; company: string;
  consent: boolean; attribution: Record<string, string>; landingPage: string;
  website: string; elapsedMs: number;
};

const roles: readonly string[] = roleOptions.map(option => option.value);
const revenues: readonly string[] = revenueOptions.map(option => option.value);

export function validateLead(value: unknown): value is LeadPayload {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  const fields: Record<string, number> = { role: 40, revenue: 20, name: 100, email: 160, phone: 20, company: 120 };
  if (!Object.entries(fields).every(([key, max]) => typeof lead[key] === "string" && (lead[key] as string).trim().length > 0 && (lead[key] as string).length <= max)) return false;
  if (!roles.includes(lead.role as string) || !revenues.includes(lead.revenue as string)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email as string)) return false;
  const digits = (lead.phone as string).replace(/\D/g, "").length;
  if (digits < 10 || digits > 11) return false;
  return lead.consent === true && typeof lead.website === "string" && typeof lead.elapsedMs === "number" && lead.attribution !== null && typeof lead.attribution === "object" && typeof lead.landingPage === "string";
}

export async function sendLead(lead: LeadPayload) {
  const endpoint = process.env.LEAD_WEBHOOK_URL;
  if (!endpoint) return { ok: false, unavailable: true };
  const revenueLabel = revenueOptions.find(option => option.value === lead.revenue)?.label ?? lead.revenue;
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.LEAD_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.LEAD_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ role: lead.role, revenue: lead.revenue, revenueLabel, name: lead.name.trim(), email: lead.email.trim(), phone: lead.phone, company: lead.company.trim(), consent: lead.consent, attribution: lead.attribution, landingPage: lead.landingPage, submittedAt: new Date().toISOString() }),
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  return { ok: response.ok, unavailable: false };
}
