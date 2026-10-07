"use client";

import { type FormEvent } from "react";
import { BriefcaseBusiness, Camera, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

interface ContactSectionProps {
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  contactAddress: string;
}

export function ContactSection({
  contactEmail,
  contactPhone,
  contactWhatsApp,
  contactAddress,
}: ContactSectionProps) {
  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const firstName = formData.get("firstName")?.toString().trim() || "new enquiry";
    const subject = `Website enquiry from ${firstName}`;
    const body = [
      `First name: ${formData.get("firstName") || "Not provided"}`,
      `Last name: ${formData.get("lastName") || "Not provided"}`,
      `Phone: ${formData.get("phone") || "Not provided"}`,
      `Email: ${formData.get("email") || "Not provided"}`,
      `Date: ${formData.get("date") || "Not provided"}`,
      `Time: ${formData.get("time") || "Not provided"}`,
      "",
      "Message:",
      formData.get("message") || "Not provided",
    ].join("\n");
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      <section id="contact" className="lets-talk-band contact-section px-6 text-cream md:px-12">
        <div className="site-container">
          <div className="lets-talk-section">
            <div className="lets-talk-copy">
              <h2>Let’s Talk!</h2>
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
            </div>

            <form className="lets-talk-form" onSubmit={handleContactSubmit}>
              <div className="lets-talk-fields lets-talk-fields-two">
                <label>
                  <span>First Name</span>
                  <input name="firstName" type="text" placeholder="First Name" autoComplete="given-name" />
                </label>
                <label>
                  <span>Last Name</span>
                  <input name="lastName" type="text" placeholder="Last Name" autoComplete="family-name" />
                </label>
              </div>

              <div className="lets-talk-fields lets-talk-fields-two">
                <label>
                  <span>Phone</span>
                  <input name="phone" type="tel" placeholder="Phone" autoComplete="tel" />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" placeholder="Email" autoComplete="email" />
                </label>
              </div>

              <div className="lets-talk-fields lets-talk-fields-two">
                <label>
                  <span>Date</span>
                  <input name="date" type="date" />
                </label>
                <label>
                  <span>Time</span>
                  <input name="time" type="time" />
                </label>
              </div>

              <label className="lets-talk-message">
                <span>Message</span>
                <textarea name="message" placeholder="Message" rows={6} />
              </label>

              <button type="submit" className="lets-talk-button">Send enquiry</button>
            </form>
          </div>
        </div>
      </section>

      <section className="contact-details-band bg-white px-6 md:px-12" aria-label="Contact details">
        <div className="site-container">
          <div className="contact-details">
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
          </div>
        </div>
      </section>
    </>
  );
}
