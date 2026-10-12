"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ArrowUpRight } from "lucide-react";
import { recordOptedInAnalytics } from "@/components/site/AnalyticsConsent";

export function AppointmentRequestForm({
  variant = "appointment",
}: {
  variant?: "appointment" | "contact";
}) {
  const isContact = variant === "contact";
  const [challenge, setChallenge] = useState<{ question: string; token: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadChallenge = async (preserveError = false) => {
    setChallenge(null);
    setAnswer("");
    if (!preserveError) setCaptchaError("");
    try {
      const response = await fetch("/api/appointment-captcha", { cache: "no-store" });
      const result = await response.json() as { question?: string; token?: string; error?: string };
      if (!response.ok || !result.question || !result.token) {
        throw new Error(result.error || "The verification question could not be loaded.");
      }
      setChallenge({ question: result.question, token: result.token });
    } catch (error) {
      console.error("Unable to load appointment verification question.", error);
      setCaptchaError(error instanceof Error ? error.message : "The verification question could not be loaded.");
    }
  };

  useEffect(() => {
    void loadChallenge();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challenge || isSubmitting) return;
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setIsSubmitting(true);
    setCaptchaError("");
    try {
      const response = await fetch("/api/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: `${formData.get("firstName")?.toString().trim() || ""} ${formData.get("lastName")?.toString().trim() || ""}`.trim(),
          email: formData.get("email")?.toString().trim() || "",
          phone: formData.get("phone")?.toString().trim() || "",
          source: variant,
          consent: formData.get("contactConsent") === "on",
          website: formData.get("website")?.toString() || "",
          token: challenge.token,
          answer,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setCaptchaError(result.error || "Your request could not be sent. Please try again.");
        if (response.status === 400) await loadChallenge(true);
      } else {
        recordOptedInAnalytics("appointment_submit", variant === "contact" ? "/contact" : "/appointment");
        setSubmitted(true);
        formElement.reset();
      }
    } catch (error) {
      console.error("Unable to submit appointment request.", error);
      setCaptchaError("Your request could not be sent. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    submitted ? <div className="appointment-request-success" role="status">
      <CheckCircle2 size={24} aria-hidden="true" />
      <div><strong>Request received</strong><p>Thank you. Our team will contact you privately using the details you provided.</p></div>
    </div> : <form
      className={isContact ? "appointment-request-form lets-talk-form" : "appointment-request-form"}
      onSubmit={handleSubmit}
    >
      <label className="sr-only" aria-hidden="true">
        Leave this field empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="appointment-form-row">
        <label>
          <span>First name*</span>
          <input name="firstName" type="text" placeholder="Your first name" autoComplete="given-name" required />
        </label>
        <label>
          <span>Last name*</span>
          <input name="lastName" type="text" placeholder="Your last name" autoComplete="family-name" required />
        </label>
      </div>
      <div className="appointment-form-row">
        <label>
          <span>Email*</span>
          <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label>
          <span>Phone number*</span>
          <input name="phone" type="tel" placeholder="+91" autoComplete="tel" required />
        </label>
      </div>
      <label className="appointment-contact-consent">
        <input type="checkbox" name="contactConsent" required />
        <span>I agree that Roar Wellness may contact me about this request. I understand my contact details will be deleted after 12 months. Please don’t include sensitive health information in this form.</span>
      </label>
      <div className="appointment-captcha">
        <label htmlFor="appointment-captcha-answer">
          <span>Quick check*</span>
          <span className="appointment-captcha-question" aria-live="polite">
            {challenge?.question || "Loading verification question..."}
          </span>
          <input
            id="appointment-captcha-answer"
            name="captchaAnswer"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min="0"
            max="99"
            step="1"
            placeholder="Your answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            required
            disabled={!challenge || isSubmitting}
          />
        </label>
        <button type="button" className="appointment-captcha-refresh" onClick={() => void loadChallenge()} disabled={isSubmitting} aria-label="Get a new math question">
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>
      {captchaError && <p className="appointment-captcha-error" role="alert">{captchaError}</p>}
      <button type="submit" className={isContact ? "lets-talk-button" : "appointment-submit"} disabled={!challenge || isSubmitting}>
        <span>{isSubmitting ? "Sending…" : "Send appointment request"}</span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
