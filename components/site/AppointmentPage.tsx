"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { DetailTestimonialsFaq } from "@/components/site/TestimonialsFaq";
import { AppointmentRequestForm } from "@/components/site/AppointmentRequestForm";
import { cmsRequest } from "@/services/cms-api";

interface AppointmentSettings {
  contactEmail?: string;
  contactPhone?: string;
}

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
          <AppointmentRequestForm contactEmail={contactEmail} />
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
