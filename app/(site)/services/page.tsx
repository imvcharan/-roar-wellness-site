import type { Metadata } from "next";
import InnerPagesPage from "@/components/site/InnerPagesPage";

export const metadata: Metadata = {
  title: "Services | Roar Wellness",
  description: "Explore Roar Wellness treatment, therapy, mental healthcare, and location services.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return <InnerPagesPage listingKind="services" />;
}
