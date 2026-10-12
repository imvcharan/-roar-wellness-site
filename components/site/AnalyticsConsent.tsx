"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const consentKey = "roar-analytics-consent";

export function recordOptedInAnalytics(eventType: "page_view" | "appointment_submit", pagePath: string): void {
  try {
    if (localStorage.getItem(consentKey) !== "accepted") return;
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ eventType, pagePath }),
    }).then((response) => {
      if (!response.ok) console.error("Unable to record opted-in site analytics.");
    }).catch((error: unknown) => console.error("Unable to record opted-in site analytics.", error));
  } catch (error) {
    console.error("Unable to read analytics consent.", error);
  }
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const lastTrackedPath = useRef("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(consentKey);
      if (stored === "accepted" || stored === "declined") {
        if (stored === "accepted") {
          void fetch("/api/analytics/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consent: stored }),
          }).then((response) => {
            if (!response.ok) throw new Error("Analytics consent could not be renewed.");
            setConsent("accepted");
            setShowPrompt(false);
          }).catch((error: unknown) => {
            console.error("Unable to renew analytics consent.", error);
            setConsent("declined");
            setShowPrompt(false);
          });
        } else {
          setConsent(stored);
          setShowPrompt(false);
        }
      } else setShowPrompt(true);
    } catch (error) {
      console.error("Unable to read analytics consent.", error);
      setConsent("declined");
      setShowPrompt(false);
    }
  }, []);

  useEffect(() => {
    if (consent === "accepted" && pathname && pathname !== lastTrackedPath.current && !pathname.startsWith("/admin")) {
      lastTrackedPath.current = pathname;
      recordOptedInAnalytics("page_view", pathname);
    }
  }, [consent, pathname]);

  const choose = async (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(consentKey, value);
      const response = await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: value }),
      });
      if (!response.ok) throw new Error("Analytics consent could not be saved.");
      setConsent(value);
      setShowPrompt(false);
    } catch (error) {
      console.error("Unable to save analytics consent.", error);
      setConsent("declined");
      try {
        localStorage.setItem(consentKey, "declined");
      } catch (storageError) {
        console.error("Unable to save declined analytics preference.", storageError);
      }
      setShowPrompt(false);
    }
  };

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {showPrompt && <aside aria-label="Cookie and privacy choices" className="privacy-consent">
        <div className="privacy-consent-copy">
          <p className="privacy-consent-eyebrow">Your privacy</p>
          <h2>Cookie preferences</h2>
          <p>We use essential storage to remember your choice. If you agree, we’ll also collect anonymous visit and appointment totals to improve the site. No advertising cookies, IP addresses, or precise location tracking.</p>
        </div>
        <div className="privacy-consent-actions">
          <button type="button" onClick={() => void choose("declined")} className="privacy-consent-secondary">Reject optional</button>
          <button type="button" onClick={() => void choose("accepted")} className="privacy-consent-primary">Accept optional analytics</button>
        </div>
      </aside>}
      {!showPrompt && consent !== null && <button type="button" onClick={() => setShowPrompt(true)} className="privacy-choices-trigger">Cookie settings</button>}
    </>
  );
}
