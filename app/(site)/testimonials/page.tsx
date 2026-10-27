import type { Metadata } from "next";
import { TestimonialsArchive } from "@/components/site/TestimonialsFaq";

export const metadata: Metadata = {
  title: "Client Testimonials | Roar Wellness",
  description: "Read experiences shared by people and families who have connected with Roar Wellness.",
};

export default function TestimonialsArchivePage() {
  return <TestimonialsArchive />;
}
