import Link from "next/link";
import { BriefcaseBusiness, Camera, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCmsSettings } from "@/lib/cms-db";

const quickLinks = [
  ["About us", "/about-roarwellness/"],
  ["Our approach", "/#about"],
  ["Treatments", "/services?category=treatments"],
  ["Facility", "/facility/"],
  ["FAQs", "/#faq"],
  ["Contact", "/contact-us/"],
];

const services = [
  { label: "Alcohol addiction", href: "/services/alcohol-addiction" },
  { label: "Drug rehabilitation", href: "/services?category=treatments" },
  { label: "Mental healthcare", href: "/services?category=mental-healthcare" },
  { label: "Yoga & meditation", href: "/services/yoga-and-meditation" },
];

const socialLinks: Array<[string, string, LucideIcon]> = [
  ["Instagram", "https://www.instagram.com/roarwellness/", Camera],
  ["Facebook", "https://www.facebook.com/roarwellness", Globe],
  ["LinkedIn", "https://www.linkedin.com/in/roarwellness/", BriefcaseBusiness],
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

          <div className="footer-column">
            <p className="footer-heading">Services</p>
            <div className="footer-link-list">
              {services.map((service) => <Link key={service.label} href={service.href}>{service.label}</Link>)}
            </div>
          </div>

          <div className="footer-column footer-contact-column">
            <p className="footer-heading">Contact</p>
            <div className="footer-contact-list">
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}><Phone size={15} aria-hidden="true" />{phone}</a>
              <a href={`mailto:${email}`}><Mail size={15} aria-hidden="true" />{email}</a>
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />WhatsApp {whatsapp}</a>
              <span><MapPin size={15} aria-hidden="true" />{address}</span>
            </div>
            <div className="footer-socials" aria-label="Social links">
              {socialLinks.map(([label, href, Icon]) => {
                return <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Roar Wellness on ${label}`}><Icon size={17} aria-hidden="true" /></a>;
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
