"use client";

import { type FormEvent } from "react";
import { BriefcaseBusiness, Camera, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

interface ContactSectionProps {
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  contactAddress: string;
  headingLevel?: "h1" | "h2";
  appearance?: "standard" | "light";
  showContactDetails?: boolean;
}

export function ContactSection({
  contactEmail,
  contactPhone,
  contactWhatsApp,
  contactAddress,
  headingLevel = "h2",
  appearance = "standard",
  showContactDetails = true,
}: ContactSectionProps) {
  const Heading = headingLevel;

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name")?.toString().trim() || "new enquiry";
    const subject = `Website enquiry from ${name}`;
    const body = [
      `Name: ${name}`,
      `Phone: ${formData.get("phone") || "Not provided"}`,
      `Email: ${formData.get("email") || "Not provided"}`,
      "",
      "Message:",
      formData.get("message") || "Not provided",
    ].join("\n");
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      <section id="contact" className={`lets-talk-band contact-section px-6 md:px-12 ${appearance === "light" ? "contact-section-light" : "text-cream"}`}>
        <div className="site-container">
          <div className="lets-talk-section">
            <div className="lets-talk-copy">
              <Heading>Let’s Talk!</Heading>
              <p className="lets-talk-kicker">A confidential first conversation</p>
              <p className="lets-talk-text">Get in touch with us using the enquiry form or contact details below.</p>
              <div className="lets-talk-socials">
                <span>Connect with us</span>
              </div>
              <div className="contact-socials" aria-label="Social media">
                <a href="https://www.instagram.com/roarwellness/" target="_blank" rel="noreferrer" aria-label="Roar Wellness on Instagram"><Camera size={18} aria-hidden="true" /></a>
                <a href="https://www.facebook.com/roarwellness" target="_blank" rel="noreferrer" aria-label="Roar Wellness on Facebook"><Globe size={18} aria-hidden="true" /></a>
                <a href="https://www.linkedin.com/in/roarwellness/" target="_blank" rel="noreferrer" aria-label="Roar Wellness on LinkedIn"><BriefcaseBusiness size={18} aria-hidden="true" /></a>
                <a href={`https://wa.me/${contactWhatsApp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="Chat with Roar Wellness on WhatsApp"><MessageCircle size={18} aria-hidden="true" /></a>
              </div>
              {showContactDetails && <div className="contact-details lets-talk-contact-details" aria-label="Contact details">
                <div className="contact-detail">
                  <Phone size={20} aria-hidden="true" />
                  <div><p>Call us</p><a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>{contactPhone}</a></div>
                </div>
                <div className="contact-detail">
                  <Mail size={20} aria-hidden="true" />
                  <div><p>Email us</p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></div>
                </div>
                <div className="contact-detail">
                  <MapPin size={20} aria-hidden="true" />
                  <div><p>Visit us</p><span>{contactAddress}</span></div>
                </div>
                <div className="contact-detail">
                  <MessageCircle size={20} aria-hidden="true" />
                  <div><p>WhatsApp</p><a href={`https://wa.me/${contactWhatsApp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{contactWhatsApp}</a></div>
                </div>
              </div>}
            </div>

            <form className="lets-talk-form" onSubmit={handleContactSubmit}>
              <label>
                <span>Name</span>
                <input name="name" type="text" placeholder="Your name" autoComplete="name" required />
              </label>
              <div className="lets-talk-fields lets-talk-fields-two">
                <label>
                  <span>Phone</span>
                  <input name="phone" type="tel" placeholder="Phone" autoComplete="tel" />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" placeholder="Your email" autoComplete="email" required />
                </label>
              </div>

              <label className="lets-talk-message">
                <span>Message</span>
                <textarea name="message" placeholder="How can we help?" rows={6} required />
              </label>

              <button type="submit" className="lets-talk-button">Send enquiry</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
