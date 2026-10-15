export interface ValidAppointmentRequest {
  name: string;
  email: string;
  phone: string;
  source: "appointment" | "contact";
  token: unknown;
  answer: unknown;
}

export function parseAppointmentRequest(value: unknown): ValidAppointmentRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 120
    || typeof data.email !== "string" || data.email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    || typeof data.phone !== "string" || !data.phone.trim() || data.phone.trim().length > 40
    || (data.source !== "appointment" && data.source !== "contact")
    || (typeof data.website === "string" && data.website.length > 0)
    || data.consent !== true) return null;

  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    source: data.source,
    token: data.token,
    answer: data.answer,
  };
}
