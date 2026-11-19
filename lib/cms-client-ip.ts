import { isIP } from "node:net";

type TrustedProxyProvider = "hostinger" | "cloudflare" | "vercel";

let missingClientIpHeaderWarned = false;

function firstForwardedAddress(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function getCmsClientIp(request: Request): string | null {
  const provider = (process.env.CMS_TRUSTED_PROXY_PROVIDER?.trim().toLowerCase()
    || "hostinger") as TrustedProxyProvider;
  let candidate: string | null;

  if (provider === "cloudflare") {
    candidate = request.headers.get("cf-connecting-ip");
  } else if (provider === "vercel") {
    candidate = firstForwardedAddress(
      request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for"),
    );
  } else if (provider === "hostinger") {
    candidate = request.headers.get("x-real-ip")
      || firstForwardedAddress(request.headers.get("x-forwarded-for"));
  } else {
    throw new Error("CMS_TRUSTED_PROXY_PROVIDER must be hostinger, cloudflare, or vercel.");
  }

  const ip = candidate?.trim();
  if (ip && isIP(ip)) return ip.toLowerCase();
  if (!missingClientIpHeaderWarned) {
    console.warn("Client IP is unavailable; public per-IP rate limits are not active. Check trusted proxy headers.");
    missingClientIpHeaderWarned = true;
  }
  return null;
}
