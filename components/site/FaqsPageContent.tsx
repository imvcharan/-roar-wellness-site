"use client";

import { useEffect, useState } from "react";
import { FaqSection, type Faq } from "@/components/site/TestimonialsFaq";
import { cmsRequest } from "@/services/cms-api";

interface CmsFaq {
  question: string;
  answer: string;
}

export default function FaqsPageContent() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [message, setMessage] = useState("Loading published FAQs...");

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: CmsFaq[] }>("/api/content/faqs")
      .then(({ data }) => {
        if (!mounted) return;
        setFaqs(data.map((faq) => [faq.question, faq.answer]));
        setMessage(data.length ? "" : "No FAQs have been published yet.");
      })
      .catch((error: unknown) => {
        console.error("Unable to load published FAQs.", error);
        if (mounted) {
          setMessage(error instanceof Error ? error.message : "FAQs are temporarily unavailable.");
        }
      });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="pt-32 md:pt-40">
      <header className="site-container px-5 py-10 md:py-14">
        <p className="eyebrow text-terracotta">Help and guidance</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-brown md:text-5xl">Frequently Asked Questions</h1>
        <p className="archive-intro">Clear, considered answers about treatment, rehabilitation, and recovery.</p>
      </header>
      {faqs.length
        ? <FaqSection faqs={faqs} />
        : <p role="status" className="site-container px-5 pb-16 text-center text-brown-muted">{message}</p>}
    </main>
  );
}
