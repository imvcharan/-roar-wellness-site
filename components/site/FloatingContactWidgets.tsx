import { ArrowUpRight, MessageCircle, Phone, Sparkles } from "lucide-react";

const googleBusinessProfileUrl = "https://www.google.com/maps/place/Roar+Wellness+Rehabilitation+Center-+Luxury+Rahab+in+Delhi/@28.4852577,77.1733245,17z/data=!3m1!4b1!4m6!3m5!1s0x390d1e345da39231:0x6402237f593c9cf2!8m2!3d28.4852577!4d77.1733245!16s%2Fg%2F1z44zmtr4?entry=ttu&g_ep=EgoyMDI2MTAyMC4wIKXMDSoASAFQAw%3D%3D";

interface FloatingContactWidgetsProps {
  phone: string;
  whatsapp: string;
}

export function FloatingContactWidgets({ phone, whatsapp }: FloatingContactWidgetsProps) {
  const phoneHref = phone.replace(/[^\d+]/g, "");
  const whatsappNumber = whatsapp.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent("Hello, I would like to know more about Roar Wellness.");

  return (
    <aside className="floating-contact-tools" aria-label="Quick contact links">
      <a
        className="floating-review-badge"
        href={googleBusinessProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View Roar Wellness reviews on its Google Business Profile"
      >
        <span className="floating-review-icon" aria-hidden="true"><Sparkles size={22} /></span>
        <span className="floating-review-copy">
          <span className="floating-review-source">GOOGLE BUSINESS PROFILE</span>
          <span className="floating-review-title">Read our reviews</span>
          <span className="floating-review-stars" aria-label="Five stars">★★★★★</span>
          <span className="floating-review-action">View our profile <ArrowUpRight size={14} aria-hidden="true" /></span>
        </span>
      </a>

      <a
        className="floating-call-link"
        href={`tel:${phoneHref}`}
        aria-label={`Call Roar Wellness at ${phone}`}
      >
        <Phone size={21} fill="currentColor" aria-hidden="true" />
        <span className="floating-call-label">Call our team</span>
      </a>

      <a
        className="floating-whatsapp-link"
        href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Roar Wellness on WhatsApp"
      >
        <span className="floating-whatsapp-copy">
          <span className="floating-whatsapp-eyebrow">HERE TO HELP</span>
          <span className="floating-whatsapp-title">Chat with our team</span>
          <span className="floating-whatsapp-action">Message us on WhatsApp</span>
        </span>
        <span className="floating-whatsapp-icon" aria-hidden="true"><MessageCircle size={23} /></span>
      </a>
    </aside>
  );
}
