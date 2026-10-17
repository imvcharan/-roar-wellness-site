import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Roar Wellness",
  description: "Practical guidance and perspectives on treatment, mental health, and lasting recovery from the Roar Wellness team.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
