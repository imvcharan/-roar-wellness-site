import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Page not found | Roar Wellness",
  description: "We couldn’t find that page. Visit Roar Wellness or contact our team for help.",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[65vh] items-center justify-center bg-cream px-6 pb-20 pt-36 text-center">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-plum">Roar Wellness</p>
          <p aria-hidden="true" className="mt-5 font-serif text-[clamp(7rem,20vw,13rem)] leading-none text-brand-blush">404</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-brand-plum-deep sm:text-4xl">
            We can’t find that page
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-brown">
            The page may have moved, or the address might be incorrect. You can head back home or explore our care options.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded bg-brand-plum px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-plum-deep"
            >
              Go to homepage
            </Link>
            <Link
              href="/appointment/"
              className="inline-flex min-h-12 items-center justify-center rounded border border-brand-plum px-6 py-3 font-semibold text-brand-plum transition-colors hover:bg-brand-blush"
            >
              Book an appointment
            </Link>
          </div>
          <p className="mt-7 text-sm text-brown">
            Need help? <Link href="/contact-us/" className="font-semibold text-brand-plum underline underline-offset-4">Contact our team</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
