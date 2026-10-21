import type { Metadata } from "next";
import { AppointmentPage } from "@/components/site/AppointmentPage";

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

export default function AppointmentRoute() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Schedule an Appointment | Roar Wellness",
    description: "Request a confidential appointment with the Roar Wellness team to talk through care and recovery options.",
    url: "https://www.roarwellness.org/appointment/",
    about: { "@id": "https://www.roarwellness.org/#organization" },
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
