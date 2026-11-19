import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Phone } from "lucide-react";
import { PageTitle } from "@/components/site/PageTitle";
import { getCmsSettings } from "@/lib/cms-db";

export const metadata: Metadata = {
  title: "Thank You | Roar Wellness",
  description: "Your request has been received. The Roar Wellness team will contact you soon.",
  alternates: {
    canonical: "/thank-you/",
  },
  robots: {
    index: false,
    follow: true,
  },
};

type ThankYouPageProps = {
  searchParams: Promise<{ "email-alert"?: string | string[] }>;
};

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const [{ "email-alert": emailAlert }, settings] = await Promise.all([searchParams, getCmsSettings()]);
  const phone = settings.contactPhone || "+919319977207";
  const phoneHref = phone.replace(/[^\d+]/g, "");
  const emailAlertUnavailable = emailAlert === "unavailable";

  return (
    <main className="thank-you-page">
      <PageTitle>Request received</PageTitle>
      <section className="thank-you-card" aria-labelledby="thank-you-title">
        <div className="thank-you-check" aria-hidden="true"><Check size={30} strokeWidth={2.5} /></div>
        <p className="appointment-eyebrow">Thank you for reaching out</p>
        <h2 id="thank-you-title">Your next step starts here.</h2>
        <p className="thank-you-message">
          {emailAlertUnavailable
            ? "Your request was saved securely, but email alerts are not configured yet. Please call our team to make sure someone can follow up."
            : "We’ve received your request. A member of the Roar Wellness team will contact you privately using the details you provided."}
        </p>
        <p className="thank-you-note">If you need to speak with someone sooner, our team is here to help.</p>
        <div className="thank-you-actions">
          <Link href="/" className="thank-you-home-link">Return to home <ArrowRight size={17} aria-hidden="true" /></Link>
          <a href={`tel:${phoneHref}`} className="thank-you-call-link"><Phone size={16} aria-hidden="true" />Call our team</a>
        </div>
      </section>
    </main>
  );
}
