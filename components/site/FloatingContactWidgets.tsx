import { MessageCircle, Phone } from "lucide-react";

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
        aria-label="Roar Wellness is rated 4.7 out of 5 from 142 Google reviews. View the Google Business Profile."
      >
        <svg className="floating-review-google-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M44 24c0-1.3-.1-2.7-.4-4H24v8h11.3c-.6 2.3-1.9 4.3-3.8 5.9l6.6 5.1C42.1 35.3 44 30 44 24z" />
          <path fill="#34A853" d="M24 44c5.4 0 10.2-1.8 13.6-4.9l-6.6-5.1c-1.8 1.2-4.1 2-7 2-5.2 0-9.6-3.5-11.2-8.2l-6.8 5.2C9.4 39.4 16.2 44 24 44z" />
          <path fill="#FBBC05" d="M12.8 27.8c-.4-1.2-.7-2.5-.7-3.8s.2-2.6.7-3.8L6 15c-1.3 2.5-2 5.6-2 9s.7 6.5 2 9z" />
          <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.4 4 24 4 16.2 4 9.4 8.6 6 15l6.8 5.2C14.4 15.5 18.8 12 24 12z" />
        </svg>
        <span className="floating-review-copy">
          <span className="floating-review-title">Roarwellness Highest Rated</span>
          <span className="floating-review-subtitle">Luxury Rehab Centre</span>
          <span className="floating-review-rating">
            <span className="floating-review-count">142+</span>
            <span className="floating-review-stars" aria-hidden="true">★★★★★</span>
          </span>
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
