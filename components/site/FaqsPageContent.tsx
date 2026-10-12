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
    <main className="faq-page">
      <header className="page-hero-band">
        <div className="page-hero-inner site-container">
          <p className="page-hero-kicker">Help and guidance</p>
          <h1 className="page-hero-title">Frequently Asked Questions</h1>
          <p className="page-hero-description">Clear, considered answers about treatment, rehabilitation, and recovery.</p>
        </div>
      </header>
      {faqs.length
        ? <FaqSection faqs={faqs} />
        : <p role="status" className="site-container px-5 pb-16 text-center text-brown-muted">{message}</p>}
    </main>
  );
}
