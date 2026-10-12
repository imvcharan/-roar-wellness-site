import type { Metadata } from "next";
import BlogPage from "@/app/(site)/blog/page";

export const metadata: Metadata = {
  title: "News & Insights | Roar Wellness",
  description: "The latest news, recovery insights, and practical guidance from Roar Wellness.",
};

export default function NewsPage() {
  return <BlogPage sectionLabel="News" />;
}
