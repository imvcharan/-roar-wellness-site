import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/lora";
import { QueryProvider } from "@/lib/query-client";
import { AnalyticsConsent } from "@/components/site/AnalyticsConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luxury Rehabilitation Centre | Drug & Alcohol Rehab Centre Delhi NCR, India",
  description: "Roar Wellness is the best rehabilitation Centre in Delhi NCR, India. Leading alcohol addiction treatment and luxury rehab facilities. Contact Roar Wellness Center Delhi.",
  verification: {
    google: "jP4Sl4hjlaTk31jiL6VWDEnqjhFTQzZF9wc0GyytV1I",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          {children}
          <AnalyticsConsent />
        </QueryProvider>
      </body>
    </html>
  );
}