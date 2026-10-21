import type { Metadata } from "next";
import GalleryPageContent from "@/components/site/GalleryPageContent";
import { galleryImageAlts, galleryImages } from "@/lib/gallery-images";

const title = "Inside Roar Wellness | Photo and Video Gallery";
const description = "View photos and videos of Roar Wellness, including our campus, shared spaces, therapy rooms, and facilities.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/gallery" },
  openGraph: {
    title,
    description,
    url: "/gallery",
    type: "website",
    images: [{ url: galleryImages[0], alt: galleryImageAlts[0] }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [galleryImages[0]],
  },
};

export default function GalleryPage() {
  return <GalleryPageContent />;
}
