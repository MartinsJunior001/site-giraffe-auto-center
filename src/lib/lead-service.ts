export type LeadPayload = {
  difficulty: string; role: string; units: string; city: string;
  name: string; company: string; phone: string; email: string;
  consent: boolean; attribution: Record<string, string>; landingPage: string;
  website: string; elapsedMs: number;
};

export function validateLead(value: unknown): value is LeadPayload {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  const fields: Record<string, number> = { difficulty: 100, role: 80, units: 10, city: 100, name: 100, company: 120, phone: 20, email: 160 };
  if (!Object.entries(fields).every(([key, max]) => typeof lead[key] === "string" && (lead[key] as string).trim().length > 0 && (lead[key] as string).length <= max)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email as string)) return false;
  if ((lead.phone as string).replace(/\D/g, "").length < 10) return false;
  return lead.consent === true && typeof lead.website === "string" && typeof lead.elapsedMs === "number" && lead.attribution !== null && typeof lead.attribution === "object" && typeof lead.landingPage === "string";
}

export async function sendLead(lead: LeadPayload) {
  const endpoint = process.env.LEAD_WEBHOOK_URL;
  if (!endpoint) return { ok: false, unavailable: true };
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.LEAD_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.LEAD_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ difficulty: lead.difficulty, role: lead.role, units: lead.units, city: lead.city, name: lead.name, company: lead.company, phone: lead.phone, email: lead.email, consent: lead.consent, attribution: lead.attribution, landingPage: lead.landingPage }),
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  return { ok: response.ok, unavailable: false };
}
