"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { faqAnchorId } from "@/lib/faq";
import { cmsRequest } from "@/services/cms-api";

export type Review = [name: string, quote: string, avatar: string];
export type Faq = [question: string, answer: string];

const femaleReviewerNames = new Set(["neha jha", "yosika patel"]);
const maleReviewerNames = new Set(["sumit kumar", "suraj kumar", "rohit yadav"]);
const organizationReviewerNames = new Set(["empirecraft limos"]);

export function getReviewAvatar(name: string, avatar: string | null | undefined): string {
  const normalizedName = name.trim().toLocaleLowerCase("en");
  if (femaleReviewerNames.has(normalizedName)) return "/images/testimonial-avatar-female.webp";
  if (maleReviewerNames.has(normalizedName)) return "/images/testimonial-avatar-male.webp";
  if (organizationReviewerNames.has(normalizedName)) return "";
  return avatar || "";
}

export const defaultReviews: Review[] = [
  ["Sumit Kumar", "If you're serious about recovery, RoarWellness is the place to go! Incredible staff, great facilities, and real results.", "/images/testimonial-avatar-male.webp"],
  ["Suraj Kumar", "Best rehab centre in Delhi I ever visited. My friend Ravi Kumar recovered from alcohol addiction from here after suffering for 19 years.", "/images/testimonial-avatar-male.webp"],
  ["Neha Jha", "One of the best rehab centre in Delhi I must say. My brother recovered from alcohol addiction from Roar Wellness. Thanks to Dhruv sir and the Roar Wellness team.", "/images/testimonial-avatar-female.webp"],
  ["Yosika Patel", "Thanks to Mr. Dhruv sir and his team for supporting us. My brother is happy now after treatment of alcohol addiction.", "/images/testimonial-avatar-female.webp"],
  ["EmpireCraft Limos", "I must say that Roar Wellness Rehab Centre is one of the best luxury rehab centres for alcohol in Delhi. Thanks for the great service.", ""],
  ["Rohit Yadav", "A supportive and professional rehab center! The therapy and care I received at RoarWellness helped me regain control of my life.", "/images/testimonial-avatar-male.webp"],
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
  image_url: string | null;
}

interface CmsFaq {
  question: string;
  answer: string;
}

export function TestimonialsSection({ reviews, variant = "cards" }: { reviews: Review[]; variant?: "cards" | "featured" }) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(mobileQuery.matches);
    updateIsMobile();
    mobileQuery.addEventListener("change", updateIsMobile);
    return () => mobileQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    if (variant === "featured" || reviews.length === 0) return;
    const timer = window.setInterval(() => {
      setReviewIndex((current) => (current + 1) % reviews.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [reviews.length, variant]);

  const visibleReviews = Array.from(
    { length: Math.min(3, reviews.length) },
    (_, offset) => reviews[(reviewIndex + offset) % reviews.length],
  );

  if (variant === "featured") {
    const pageSize = isMobile ? 1 : 2;
    const featuredPageCount = Math.ceil(reviews.length / pageSize);
    const currentPage = featuredPageCount ? reviewIndex % featuredPageCount : 0;
    const featuredReviews = reviews.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
    const moveReview = (offset: number) => {
      if (featuredPageCount < 2) return;
      setReviewIndex((current) => (current + offset + featuredPageCount) % featuredPageCount);
    };

    return (
      <section id="stories" className="review-featured-section px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="review-featured-heading">
            <p className="eyebrow">Testimonials</p>
            <h2>Healing through <em>their eyes</em></h2>
            <Link href="/testimonials/" className="services-browse-link">Read all testimonials <span aria-hidden="true">→</span></Link>
          </div>
          {featuredReviews.length > 0 && (
            <div className="review-featured-layout" aria-live="polite">
              {featuredReviews.map(([name, quote, avatar]) => (
                <article key={name} className="review-featured-quote">
                  <span className="review-featured-mark" aria-hidden="true">“</span>
                  <blockquote>{quote}</blockquote>
                  <div className="review-featured-author">
                    {avatar
                      ? <img src={avatar} alt="" className="review-featured-avatar" />
                      : <span aria-hidden="true" className="review-featured-avatar review-featured-avatar-fallback rounded-full bg-[#ede9dd] font-semibold text-[#695f53]">{name.trim().charAt(0).toUpperCase()}</span>}
                    <p className="review-featured-name">{name}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {featuredPageCount > 0 && (
            <div className="review-featured-controls" aria-label="Testimonial controls">
              <button type="button" onClick={() => moveReview(-1)} aria-label="Previous testimonials" disabled={featuredPageCount < 2}>←</button>
              <div className="review-featured-pagination" aria-label="Testimonial pages">
                {Array.from({ length: featuredPageCount }, (_, page) => (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Show testimonial group ${page + 1}`}
                    aria-current={page === currentPage ? "page" : undefined}
                    onClick={() => setReviewIndex(page)}
                  />
                ))}
              </div>
              <button type="button" onClick={() => moveReview(1)} aria-label="Next testimonials" disabled={featuredPageCount < 2}>→</button>
            </div>
          )}
        </div>
      </section>
    );
  }

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
                <div className="review-name">
                  {avatar
                    ? <img src={avatar} alt="" className="review-avatar" />
                    : <span aria-hidden="true" className="review-avatar flex items-center justify-center bg-[#ede9dd] font-semibold text-[#695f53]">{name.trim().charAt(0).toUpperCase()}</span>}
                  <span>{name}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialsArchive() {
  const [reviews, setReviews] = useState<Review[]>(defaultReviews);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: Record<string, CmsHomeSection[]> }>("/api/content/home")
      .then(({ data }) => {
        if (!mounted) return;
        const publishedReviews = (data.reviews || []).map((item) => [
          item.heading,
          item.body || "",
          getReviewAvatar(item.heading, item.image_url),
        ] as Review).filter(([, quote]) => quote.trim().length > 0);
        setReviews(publishedReviews.length ? publishedReviews : defaultReviews);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        console.error("Unable to load published testimonials.", loadError);
        setError(loadError instanceof Error ? loadError.message : "Published testimonials are temporarily unavailable.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return (
    <main className="testimonial-archive px-6 py-20 md:px-12 md:py-28">
      <div className="site-container">
        <header className="testimonial-archive-heading">
          <p className="eyebrow text-coral">Stories from our community</p>
          <h1 className="section-title mt-5 text-olive">Words from the <em>recovery journey</em></h1>
          <p>Experiences shared by people and families who have connected with Roar Wellness.</p>
        </header>
        {loading && <p role="status" className="mt-8 text-sm text-cms-muted">Loading testimonials...</p>}
        {error && <p role="status" className="mt-8 text-sm text-cms-muted">{error} Showing available stories.</p>}
        {!loading && reviews.length > 0 && (
          <div className="testimonial-archive-grid" aria-label="Client testimonials">
            {reviews.map(([name, quote, avatar], index) => (
              <article key={`${name}-${index}`} className="testimonial-archive-card">
                <span className="testimonial-archive-mark" aria-hidden="true">“</span>
                <blockquote>{quote}</blockquote>
                <div className="review-name">
                  {avatar
                    ? <img src={avatar} alt="" className="review-avatar" loading="lazy" />
                    : <span aria-hidden="true" className="review-avatar flex items-center justify-center bg-[#ede9dd] font-semibold text-[#695f53]">{name.trim().charAt(0).toUpperCase()}</span>}
                  <span>{name}</span>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && reviews.length === 0 && <p role="status" className="mt-8">No testimonials are currently available.</p>}
        <p className="testimonial-archive-note">Testimonials reflect individual experiences; outcomes vary.</p>
      </div>
    </main>
  );
}

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  return (
    <section id="faq" className="site-faq px-6 py-20 md:px-12 md:py-28">
      <div className="site-container grid gap-14 md:grid-cols-[.7fr_1.3fr]">
        <div>
          <p className="site-faq-eyebrow eyebrow mb-5">FAQ&apos;s</p>
          <h2 className="site-faq-title section-title">Healing starts <em>with clarity</em></h2>
        </div>
        <div className="site-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question} id={faqAnchorId(question)} className="site-faq-item group py-6">
              <summary className="site-faq-question flex cursor-pointer list-none items-center justify-between gap-8 font-serif text-2xl">
                <span>{question}</span>
                <span className="site-faq-plus transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="site-faq-answer max-w-2xl pt-4 font-sans leading-7">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DetailTestimonialsFaq({ showTestimonials = true }: { showTestimonials?: boolean }) {
  const [reviews, setReviews] = useState(defaultReviews);
  const [faqs, setFaqs] = useState(defaultFaqs);

  useEffect(() => {
    let mounted = true;
    if (showTestimonials) {
      cmsRequest<{ data: Record<string, CmsHomeSection[]> }>("/api/content/home")
        .then(({ data }) => {
          if (mounted) setReviews((data.reviews || []).map((item) => [item.heading, item.body, item.image_url || ""] as Review));
        })
        .catch((error: unknown) => console.error("Unable to load published testimonials.", error));
    }
    cmsRequest<{ data: CmsFaq[] }>("/api/content/faqs")
      .then(({ data }) => {
        if (mounted) setFaqs(data.map((faq) => [faq.question, faq.answer] as Faq));
      })
      .catch((error: unknown) => console.error("Unable to load published FAQs.", error));

    return () => { mounted = false; };
  }, []);

  return (
    <>
      {showTestimonials && <TestimonialsSection reviews={reviews} />}
      <FaqSection faqs={faqs} />
    </>
  );
}
