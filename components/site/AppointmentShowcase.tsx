import Link from "next/link";

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
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="home-appointment-call">Prefer to call? {phone}</a>
        </div>
      </div>
    </section>
  );
}
