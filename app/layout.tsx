import type { Metadata } from "next";
import "@fontsource-variable/inter";
import { QueryProvider } from "@/lib/query-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roar Wellness | Rehabilitation Centre in Delhi",
  description: "Personalized, evidence-based rehabilitation and mental healthcare at Roar Wellness in Delhi.",
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
        </QueryProvider>
      </body>
    </html>
  );
}