import Link from "next/link";
import { Phone } from "lucide-react";

export function AppointmentShowcase({ phone }: { phone: string }) {
  return (
    <section className="home-appointment-showcase" aria-labelledby="home-appointment-title">
      <div className="home-appointment-card">
        <div className="home-appointment-image" aria-hidden="true" />
        <div className="home-appointment-copy">
          <h2 id="home-appointment-title">Ready to begin your healing journey?</h2>
          <Link href="/appointment/" className="home-appointment-link">
            <span>Make an Appointment</span><span aria-hidden="true">→</span>
          </Link>
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="appointment-callout home-appointment-call">
            <span className="appointment-callout-icon"><Phone size={17} aria-hidden="true" /></span>
            <span className="appointment-callout-copy">
              <span className="appointment-callout-label">Prefer to call?</span>
              <span className="appointment-callout-number">{phone}</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
