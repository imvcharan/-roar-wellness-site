import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { Metadata } from "next";
import { getCmsSettings } from "@/lib/cms-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getCmsSettings();
  const siteUrl = settings.siteUrl || "https://www.roarwellness.org";
  const title = settings.seoTitle || settings.siteName || "Luxury Rehabilitation Centre | Drug & Alcohol Rehab Centre Delhi NCR, India";
  const description = settings.seoDescription || settings.siteDescription || "Roar Wellness is the best rehabilitation Centre in Delhi NCR, India. Leading alcohol addiction treatment and luxury rehab facilities. Contact Roar Wellness Center Delhi.";
  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      siteName: settings.siteName || "Roar Wellness",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "https://www.roarwellness.org/wp-content/uploads/2025/06/1aa.jpg",
          width: 768,
          height: 512,
          alt: "Roar Wellness rehabilitation and recovery care",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.roarwellness.org/wp-content/uploads/2025/06/1aa.jpg"],
    },
  };
}

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = getCmsSettings();
  const siteUrl = (settings.siteUrl || "https://www.roarwellness.org").replace(/\/+$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalOrganization",
        "@id": `${siteUrl}/#organization`,
        name: settings.siteName || "Roar Wellness",
        url: `${siteUrl}/`,
        logo: `${siteUrl}/images/logo.png`,
        telephone: settings.contactPhone || "+919319977207",
        email: settings.contactEmail || "help@roarwellness.org",
        address: settings.contactAddress,
        sameAs: [
          "https://www.instagram.com/roarwellness/",
          "https://www.facebook.com/roarwellness",
          "https://x.com/roar_wellness",
          "https://www.linkedin.com/in/roarwellness/",
          "https://in.pinterest.com/roarwellnessrehab/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: settings.siteName || "Roar Wellness",
        description: settings.siteDescription,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-IN",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}