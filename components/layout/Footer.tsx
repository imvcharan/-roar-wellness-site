import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getCmsSettings } from "@/lib/cms-db";
import { treatmentNavigationLinks } from "@/lib/treatment-navigation";

type SocialBrand = "Instagram" | "Facebook" | "X" | "LinkedIn" | "Pinterest";

function SocialIcon({ brand }: { brand: SocialBrand }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };

  switch (brand) {
    case "Instagram":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.25" /></svg>;
    case "Facebook":
      return <svg {...common}><path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8z" /></svg>;
    case "X":
      return <svg {...common}><path d="M18.9 3H22l-6.8 7.8L23.2 21h-6.3L12 14.7 6.5 21H3.3l7.3-8.4L2.8 3h6.5l4.5 5.9zm-1.1 16h1.7L8.3 4.9H6.5z" /></svg>;
    case "LinkedIn":
      return <svg {...common}><path d="M5.2 8.5A2.2 2.2 0 1 0 5.2 4a2.2 2.2 0 0 0 0 4.5M3.3 10h3.8v11H3.3zm6.1 0H13v1.5h.1a4 4 0 0 1 3.6-1.9c3.8 0 4.5 2.5 4.5 5.7V21h-3.8v-5c0-1.2 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V21H9.4z" /></svg>;
    case "Pinterest":
      return <svg {...common}><path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.8.2-2.7l1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.3-2.4 3.3-5.3 0-2.2-1.5-3.9-4.2-3.9-3.1 0-5 2.3-5 4.8 0 .9.3 1.9.8 2.4.2.3.3.4.2.7l-.3 1c-.1.3-.3.4-.6.3-1.3-.5-1.9-1.9-1.9-3.5 0-2.6 2.2-5.8 6.7-5.8 3.6 0 6 2.6 6 5.4 0 3.7-2.1 6.5-5.2 6.5-1 0-2-.6-2.4-1.2l-.7 2.8c-.2 1-.8 1.9-1.2 2.6A10 10 0 1 0 12 2" /></svg>;
  }
}

const quickLinks = [
  ["Home", "/#top"],
  ["About us", "/about-roarwellness/"],
  ["Our approach", "/#about"],
  ["Services", "/services"],
  ["Book an appointment", "/appointment/"],
  ["Facility", "/facility/"],
  ["Gallery", "/gallery/"],
  ["FAQs", "/faqs/"],
  ["Contact", "/contact-us/"],
];

const socialLinks: Array<[SocialBrand, string]> = [
  ["Instagram", "https://www.instagram.com/roarwellness/"],
  ["Facebook", "https://www.facebook.com/roarwellness"],
  ["X", "https://x.com/roar_wellness"],
  ["LinkedIn", "https://www.linkedin.com/in/roarwellness/"],
  ["Pinterest", "https://in.pinterest.com/roarwellnessrehab/"],
];

export function Footer() {
  const settings = getCmsSettings();
  const phone = settings.contactPhone || "+919319977207";
  const email = settings.contactEmail || "help@roarwellness.org";
  const whatsapp = settings.contactWhatsApp || "+919773890499";
  const address = settings.contactAddress
    || "Akhil Farm, 1 Daisy Lane, Off Central Drive, DLF Chattarpur Farms, New Delhi 110074, India";

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-columns">
          <div className="footer-brand-column">
            <Link href="/#top" aria-label="Roar Wellness home" className="footer-logo-link">
              <img src="/images/logo.png" alt="Roar Wellness" className="footer-logo" />
            </Link>
            <p className="footer-tagline">A thoughtful path to lasting recovery, built around care, clarity, and connection.</p>
            <p className="footer-location">Rehabilitation centre<br />Delhi NCR, India</p>
          </div>

          <nav className="footer-column" aria-label="Quick navigation">
            <p className="footer-heading">Quick navigation</p>
            <div className="footer-link-list">
              {quickLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
            </div>
          </nav>

          <nav className="footer-column" aria-label="Treatments">
            <p className="footer-heading">Treatments</p>
            <div className="footer-link-list">
              {treatmentNavigationLinks.map((treatment) => <Link key={treatment.label} href={treatment.href}>{treatment.label}</Link>)}
            </div>
          </nav>

          <div className="footer-column footer-contact-column">
            <p className="footer-heading">Contact</p>
            <div className="footer-contact-list">
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}><Phone size={15} aria-hidden="true" />{phone}</a>
              <a href={`mailto:${email}`}><Mail size={15} aria-hidden="true" />{email}</a>
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />WhatsApp {whatsapp}</a>
              <span><MapPin size={15} aria-hidden="true" />{address}</span>
            </div>
            <div className="footer-socials" aria-label="Social links">
              {socialLinks.map(([label, href]) => {
                return <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Roar Wellness on ${label}`}><SocialIcon brand={label} /></a>;
              })}
            </div>
          </div>
        </div>

        <div className="footer-meta">
          <p>© 2009–2025 Roar Wellness</p>
          <p>Care that moves people forward.</p>
        </div>
      </div>
    </footer>
  );
}
