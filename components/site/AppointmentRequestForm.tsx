"use client";

import { type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
      <button type="submit" className={isContact ? "lets-talk-button" : "appointment-submit"}>
        <span>Send appointment request</span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
