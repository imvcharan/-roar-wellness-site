"use client";

import { type FormEvent, useEffect, useState } from "react";
import { RefreshCw, ArrowUpRight } from "lucide-react";

const supportOptions = [
  "Alcohol and substance use",
  "Mental health support",
  "Therapy and wellbeing",
  "Family guidance",
  "Not sure yet",
];

export function AppointmentRequestForm({
  contactEmail,
  variant = "appointment",
}: {
  contactEmail: string;
  variant?: "appointment" | "contact";
}) {
  const isContact = variant === "contact";
  const [challenge, setChallenge] = useState<{ question: string; token: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setCaptchaError("");

    try {
      const verification = await fetch("/api/appointment-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token: challenge.token, answer }),
      });
      const result = await verification.json() as { verified?: boolean; error?: string };
      if (!verification.ok || result.verified !== true) {
        setCaptchaError(result.error || "The answer could not be verified. Please try again.");
        await loadChallenge(true);
        return;
      }
    } catch (error) {
      console.error("Unable to verify appointment math answer.", error);
      setCaptchaError("The answer could not be verified. Please try again.");
      return;
    } finally {
      setIsSubmitting(false);
    }

    const firstName = formData.get("firstName")?.toString().trim() || "";
    const lastName = formData.get("lastName")?.toString().trim() || "";
    const name = `${firstName} ${lastName}`.trim();
    const body = [
      `Name: ${name}`,
      `Email: ${formData.get("email") || "Not provided"}`,
      `Phone: ${formData.get("phone") || "Not provided"}`,
      `Area of support: ${formData.get("support") || "Not provided"}`,
      "",
      "Message:",
      formData.get("message") || "Not provided",
    ].join("\n");
    const subject = `Appointment request from ${name}`;
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form
      className={isContact ? "appointment-request-form lets-talk-form" : "appointment-request-form"}
      onSubmit={handleSubmit}
    >
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
      <label>
        <span>How can we support you?*</span>
        <select name="support" defaultValue="" required>
          <option value="" disabled>Select an area of support</option>
          {supportOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>Message*</span>
        <textarea name="message" placeholder="Share anything you’d like us to know..." rows={3} required />
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
        <span>Send appointment request</span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
