"use client";

import { useEffect, useState } from "react";
import { faqAnchorId } from "@/lib/faq";
import { cmsRequest } from "@/services/cms-api";

export type Review = [name: string, quote: string, avatar: string];
export type Faq = [question: string, answer: string];

export const defaultReviews: Review[] = [
  ["Sumit Kumar", "If you're serious about recovery, RoarWellness is the place to go! Incredible staff, great facilities, and real results.", "https://i.pravatar.cc/96?img=12"],
  ["Suraj Kumar", "Best rehab centre in Delhi I ever visited. My friend Ravi Kumar recovered from alcohol addiction from here after suffering for 19 years.", "https://i.pravatar.cc/96?img=13"],
  ["Neha Jha", "One of the best rehab centre in Delhi I must say. My brother recovered from alcohol addiction from Roar Wellness. Thanks to Dhruv sir and the Roar Wellness team.", "https://i.pravatar.cc/96?img=47"],
  ["Yosika Patel", "Thanks to Mr. Dhruv sir and his team for supporting us. My brother is happy now after treatment of alcohol addiction.", "https://i.pravatar.cc/96?img=32"],
  ["EmpireCraft Limos", "I must say that Roar Wellness Rehab Centre is one of the best luxury rehab centres for alcohol in Delhi. Thanks for the great service.", "https://i.pravatar.cc/96?img=68"],
  ["Rohit Yadav", "A supportive and professional rehab center! The therapy and care I received at RoarWellness helped me regain control of my life.", "https://i.pravatar.cc/96?img=11"],
];

export const defaultFaqs: Faq[] = [
  ["What are the commonly abused drugs?", "Alcohol, Marijuana, amphetamine-type stimulants (basic over the counter drugs), cocaine, heroin, hallucinogens, and party drugs are commonly abused."],
  ["What are some recurring side effects to drug abuse?", "Apart from physical dependency, anxiety or depression often affects the life of nearly every addict. A psychological disorder may also arise from drug addiction."],
  ["What are some serious health issues related to drug abuse?", "Along with serious physiological damage, drug abuse often results in a psychological disorder and can damage neurological function."],
  ["Is drug abuse influencing women in India?", "Yes. The association between women and substance abuse disorder is becoming an inconvenient reality in India, as cultural roles change and addiction becomes more visible."],
  ["Why should addicts consider rehabilitation?", "Rehabilitation centres are organizations committed to seeing addicts reach a state of total abstinence based on the 12 step program."],
  ["What is 12 step treatment?", "Originally designed for alcoholics, the 12 step program begins by admitting powerlessness over alcohol and drugs, then guides people toward satisfying lives apart from substance abuse."],
  ["Why are the 12 steps successful?", "Adopted from Alcoholics Anonymous, the 12 steps help people overcome denial and develop a practice of seeking objective feedback."],
];

interface CmsHomeSection {
  heading: string;
  body: string;
  image_url: string;
}

interface CmsFaq {
  question: string;
  answer: string;
}

export function TestimonialsSection({ reviews }: { reviews: Review[] }) {
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    if (reviews.length === 0) return;
    const timer = window.setInterval(() => {
      setReviewIndex((current) => (current + 1) % reviews.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [reviews.length]);

  const visibleReviews = Array.from(
    { length: Math.min(3, reviews.length) },
    (_, offset) => reviews[(reviewIndex + offset) % reviews.length],
  );

  return (
    <section id="stories" className="band-light px-6 py-20 md:px-12 md:py-28">
      <div className="site-container">
        <div className="mb-14 flex items-end justify-between gap-8">
          <div className="review-heading-copy">
            <p className="eyebrow text-coral">From our clients</p>
            <h2 className="section-title mt-5 max-w-none text-olive">Words from our <em>recovery journey</em></h2>
          </div>
          <span className="hidden font-serif text-6xl text-coral/40 md:block">“</span>
        </div>

        <div className="review-viewport overflow-hidden">
          <div className="review-grid review-track">
            {visibleReviews.map(([name, quote, avatar], index) => (
              <article key={`${name}-${index}`} className="review-card review-card-animate min-h-[17rem]">
                <p className="review-stars">★★★★★</p>
                <blockquote>&ldquo;{quote}&rdquo;</blockquote>
                <div className="review-name"><img src={avatar} alt="" className="review-avatar" /><span>{name}</span></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  return (
    <section id="faq" className="bg-sand px-6 py-20 md:px-12 md:py-28">
      <div className="site-container grid gap-14 md:grid-cols-[.7fr_1.3fr]">
        <div>
          <p className="eyebrow mb-5 text-coral">FAQ&apos;s</p>
          <h2 className="section-title text-olive">Healing starts <em>with clarity</em></h2>
        </div>
        <div className="border-t border-olive/20">
          {faqs.map(([question, answer]) => (
            <details key={question} id={faqAnchorId(question)} className="group border-b border-olive/20 py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-8 font-serif text-2xl text-olive">
                <span>{question}</span>
                <span className="text-coral transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pt-4 font-sans leading-7 text-olive/65">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DetailTestimonialsFaq() {
  const [reviews, setReviews] = useState(defaultReviews);
  const [faqs, setFaqs] = useState(defaultFaqs);

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: Record<string, CmsHomeSection[]> }>("/api/content/home")
      .then(({ data }) => {
        if (mounted) setReviews((data.reviews || []).map((item) => [item.heading, item.body, item.image_url] as Review));
      })
      .catch((error: unknown) => console.error("Unable to load published testimonials.", error));
    cmsRequest<{ data: CmsFaq[] }>("/api/content/faqs")
      .then(({ data }) => {
        if (mounted) setFaqs(data.map((faq) => [faq.question, faq.answer] as Faq));
      })
      .catch((error: unknown) => console.error("Unable to load published FAQs.", error));

    return () => { mounted = false; };
  }, []);

  return (
    <>
      <TestimonialsSection reviews={reviews} />
      <FaqSection faqs={faqs} />
    </>
  );
}
