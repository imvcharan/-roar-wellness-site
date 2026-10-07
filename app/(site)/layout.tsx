import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { Metadata } from "next";
import { getCmsSettings } from "@/lib/cms-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getCmsSettings();
  return {
    title: settings.seoTitle || settings.siteName || "Roar Wellness",
    description: settings.seoDescription || settings.siteDescription,
    metadataBase: new URL(settings.siteUrl || "https://www.roarwellness.org"),
    openGraph: {
      title: settings.seoTitle || settings.siteName || "Roar Wellness",
      description: settings.seoDescription || settings.siteDescription,
      siteName: settings.siteName || "Roar Wellness",
      type: "website",
    },
  };
}

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}