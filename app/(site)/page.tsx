import type { Metadata } from "next";
import HomePageClient from "@/components/site/HomePageClient";
import { getCmsSettings } from "@/lib/cms-db";

const legacyHomeImage = "https://www.roarwellness.org/wp-content/uploads/2025/06/1aa.jpg";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getCmsSettings();
  const siteUrl = (settings.siteUrl || "https://www.roarwellness.org").replace(/\/+$/, "");
  const title = settings.seoTitle || settings.siteName || "Luxury Rehabilitation Centre | Drug & Alcohol Rehab Centre Delhi NCR, India";
  const description = settings.seoDescription || settings.siteDescription || "Roar Wellness is the best rehabilitation Centre in Delhi NCR, India. Leading alcohol addiction treatment and luxury rehab facilities. Contact Roar Wellness Center Delhi.";

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      siteName: settings.siteName || "Roar Wellness",
      locale: "en_US",
      type: "website",
      url: `${siteUrl}/`,
      images: [{ url: legacyHomeImage, width: 768, height: 512, alt: "Roar Wellness rehabilitation and recovery care" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [legacyHomeImage],
    },
  };
}

export default function Home() {
  const settings = getCmsSettings();
  const siteUrl = (settings.siteUrl || "https://www.roarwellness.org").replace(/\/+$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/#webpage`,
    url: `${siteUrl}/`,
    name: settings.seoTitle || settings.siteName || "Luxury Rehabilitation Centre | Drug & Alcohol Rehab Centre Delhi NCR, India",
    description: settings.seoDescription || settings.siteDescription,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en-IN",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HomePageClient />
    </>
  );
}
