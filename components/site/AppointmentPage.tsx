"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { DetailTestimonialsFaq } from "@/components/site/TestimonialsFaq";
import { cmsRequest } from "@/services/cms-api";

interface AppointmentSettings {
  contactEmail?: string;
  contactPhone?: string;
}

const supportOptions = [
  "Alcohol and substance use",
  "Mental health support",
  "Therapy and wellbeing",
  "Family guidance",
  "Not sure yet",
];

export function AppointmentPage() {
  const [settings, setSettings] = useState<AppointmentSettings>({
    contactEmail: "help@roarwellness.org",
    contactPhone: "+919319977207",
  });

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: AppointmentSettings }>("/api/content/settings")
      .then(({ data }) => {
        if (mounted) setSettings((current) => ({ ...current, ...data }));
      })
      .catch((error: unknown) => console.error("Unable to load appointment contact settings.", error));
    return () => { mounted = false; };
  }, []);

  const handleAppointmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const firstName = formData.get("firstName")?.toString().trim() || "";
    const lastName = formData.get("lastName")?.toString().trim() || "";
    const name = `${firstName} ${lastName}`.trim();
    const subject = `Appointment request from ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${formData.get("email") || "Not provided"}`,
      `Phone: ${formData.get("phone") || "Not provided"}`,
      `Area of support: ${formData.get("support") || "Not provided"}`,
      "",
      "Message:",
      formData.get("message") || "Not provided",
    ].join("\n");
    window.location.href = `mailto:${settings.contactEmail || "help@roarwellness.org"}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const contactPhone = settings.contactPhone || "+919319977207";
  const contactEmail = settings.contactEmail || "help@roarwellness.org";

  return (
    <main className="appointment-page">
      <section className="appointment-booking site-container" aria-labelledby="appointment-title">
        <div className="appointment-booking-image">
          <img src="/images/recovery-at-your-pace.webp" alt="A clinician listening to someone during a private conversation" />
          <p>Every recovery journey begins with being heard.</p>
        </div>
        <div className="appointment-booking-content">
          <p className="appointment-eyebrow">Schedule</p>
          <h1 id="appointment-title">Book your appointment</h1>
          <p className="appointment-intro">Tell us a little about what you’re looking for. Our team will reach out privately to talk through the next step.</p>
          <form className="appointment-request-form" onSubmit={handleAppointmentSubmit}>
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
            <button type="submit" className="appointment-submit">
              <span>Send appointment request</span><ArrowUpRight size={17} aria-hidden="true" />
            </button>
          </form>
          <p className="appointment-form-note">Your email app will open with your request ready to send. Our team will follow up to confirm a suitable time.</p>
          <div className="appointment-contact-links">
            <a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}><Phone size={15} aria-hidden="true" />{contactPhone}</a>
            <a href={`mailto:${contactEmail}`}><Mail size={15} aria-hidden="true" />{contactEmail}</a>
          </div>
        </div>
      </section>
      <DetailTestimonialsFaq showTestimonials={false} />
    </main>
  );
}
