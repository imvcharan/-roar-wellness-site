import type { Metadata } from "next";
import { AppointmentPage } from "@/components/site/AppointmentPage";
import { getCmsSettings } from "@/lib/cms-db";

export const metadata: Metadata = {
  title: "Schedule an Appointment | Roar Wellness",
  description: "Request a confidential appointment with the Roar Wellness team to talk through care and recovery options.",
  alternates: {
    canonical: "/appointment/",
  },
  openGraph: {
    title: "Schedule an Appointment | Roar Wellness",
    description: "Request a confidential appointment with the Roar Wellness team to talk through care and recovery options.",
    url: "/appointment/",
    type: "website",
    images: [
      {
        url: "/images/recovery-at-your-pace.webp",
        alt: "A clinician listening to someone during a private conversation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedule an Appointment | Roar Wellness",
    description: "Request a confidential appointment with the Roar Wellness team to talk through care and recovery options.",
    images: ["/images/recovery-at-your-pace.webp"],
  },
};

export default async function AppointmentRoute() {
  const settings = await getCmsSettings();
  const siteUrl = (settings.siteUrl || "https://www.roarwellness.org").replace(/\/+$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Schedule an Appointment | Roar Wellness",
    description: "Request a confidential appointment with the Roar Wellness team to talk through care and recovery options.",
    url: `${siteUrl}/appointment`,
    about: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en-IN",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <AppointmentPage />
    </>
  );
}
