import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/lora";
import { QueryProvider } from "@/lib/query-client";
import { AnalyticsConsent } from "@/components/site/AnalyticsConsent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luxury Rehabilitation Centre | Drug & Alcohol Rehab Centre Delhi NCR, India",
  description: "Roar Wellness is the best rehabilitation Centre in Delhi NCR, India. Leading alcohol addiction treatment and luxury rehab facilities. Contact Roar Wellness Center Delhi.",
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