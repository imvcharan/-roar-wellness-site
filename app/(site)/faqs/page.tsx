import type { Metadata } from "next";
import FaqsPageContent from "@/components/site/FaqsPageContent";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Roar Wellness",
  description: "Answers to common questions about addiction, treatment, rehabilitation, and recovery at Roar Wellness.",
};

export default function FaqsPage() {
  return <FaqsPageContent />;
}
