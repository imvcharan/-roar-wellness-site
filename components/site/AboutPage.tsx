"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Play, X } from "lucide-react";
import { DetailTestimonialsFaq } from "@/components/site/TestimonialsFaq";

const philosophy = [
  {
    title: "Long-Term Recovery",
    description: "We focus on steady progress and lasting wellbeing, with care shaped around each person's needs.",
  },
  {
    title: "Whole-Person Care",
    description: "Physical health, emotional wellbeing, and psychological support belong in the same conversation.",
  },
  {
    title: "Care in Partnership",
    description: "Clients, families, physicians, and therapists work together with openness and trust.",
  },
  {
    title: "A Supportive Environment",
    description: "A confidential, respectful setting helps people take the next step at a pace that feels possible.",
  },
];

const foundations = [
  {
    title: "A commitment since 2013",
    description: "Roar Wellness has supported people and families seeking a path forward from addiction.",
  },
  {
    title: "Founded with a shared purpose",
    description: "An initiative led by Madhav Singh and the late Sanjay Mathur, with Dhruv Tanwar as Director.",
  },
  {
    title: "Experienced care team",
    description: "Professionals work together to provide considered, specialist support throughout recovery.",
  },
  {
    title: "Integrated treatment approach",
    description: "Programs address substance use patterns alongside the emotional and psychological needs that may accompany them.",
  },
  {
    title: "A plan built around the person",
    description: "Care is developed in partnership with each client, their physician, therapist, and other relevant supports.",
  },
];

export function AboutPage({ phone }: { phone: string }) {
  const pageRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const sections = pageRef.current?.querySelectorAll<HTMLElement>(".about-reference-reveal");
    if (!sections?.length) return;
    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!videoOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVideoOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [videoOpen]);

  return (
    <main ref={pageRef} className="about-reference-page">
      <section className="about-reference-hero" aria-labelledby="about-reference-title">
        <div className="about-reference-hero-backdrop" aria-hidden="true" />
        <div className="about-reference-hero-content">
          <p className="about-reference-kicker">About Roar Wellness</p>
          <h1 id="about-reference-title">Care that sees <em>the whole person</em></h1>
          <a href="#about-reference-story" className="about-reference-scroll">
            Discover our story <ArrowDown size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section id="about-reference-story" className="about-reference-story about-reference-reveal" aria-labelledby="about-reference-story-title">
        <div className="about-reference-story-heading">
          <p className="about-reference-kicker">Our story</p>
          <h2 id="about-reference-story-title">A journey toward <em>lasting healing</em></h2>
        </div>
        <div className="about-reference-story-grid">
          <figure className="about-reference-story-image">
            <img src="/images/about-roar-wellness.webp" alt="A welcoming meeting space at Roar Wellness in Delhi" />
            <figcaption>Roar Wellness · New Delhi</figcaption>
          </figure>
          <div className="about-reference-story-copy">
            <p>Roar Wellness began in 2013 with a commitment to help people and families affected by addiction find a safe, supportive way forward.</p>
            <p>Founded by Madhav Singh and the late Sanjay Mathur, and led by Director Dhruv Tanwar, our team brings together experienced professionals to provide specialist, confidential care.</p>
            <p>We understand that every person’s circumstances are different. Our programs look beyond substance use alone, supporting physical health alongside emotional and psychological wellbeing.</p>
            <p>Recovery is a shared process. We work in partnership with each client, their physician, therapist, and support network to help build a foundation for long-term wellness.</p>
          </div>
        </div>
      </section>

      <section className="about-reference-film" aria-label="Roar Wellness recovery film">
        <img src="/images/facility-yoga-meditation.webp" alt="" />
        <div className="about-reference-film-overlay" />
        <button type="button" className="about-reference-play" onClick={() => setVideoOpen(true)} aria-label="Play Roar Wellness recovery film">
          <Play size={25} fill="currentColor" aria-hidden="true" />
        </button>
      </section>

      <section className="about-reference-philosophy about-reference-reveal" aria-labelledby="about-reference-philosophy-title">
        <div className="about-reference-section-heading">
          <p className="about-reference-kicker">Our philosophy</p>
          <h2 id="about-reference-philosophy-title">The heart behind <em>the healing</em></h2>
        </div>
        <ol className="about-reference-principles">
          {philosophy.map((item, index) => (
            <li className="about-reference-principle" key={item.title}>
              <span className="about-reference-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-reference-foundation about-reference-reveal" aria-labelledby="about-reference-foundation-title">
        <div className="about-reference-foundation-title">
          <p className="about-reference-kicker">Our foundation</p>
          <h2 id="about-reference-foundation-title">Building a foundation <em>for recovery</em></h2>
          <p>Experience, collaboration, and person-centred care shape the support we offer.</p>
        </div>
        <div className="about-reference-foundation-list">
          <h3><span aria-hidden="true">—</span> Our care, built on experience</h3>
          {foundations.map((item, index) => (
            <article className="about-reference-foundation-item" key={item.title}>
              <span className="about-reference-foundation-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-reference-appointment about-reference-reveal" aria-labelledby="about-reference-appointment-title">
        <div className="about-reference-appointment-card">
          <img src="/images/ready-to-begin.webp" alt="A welcoming consultation at Roar Wellness" />
          <div className="about-reference-appointment-copy">
            <p className="about-reference-kicker">One step at a time</p>
            <h2 id="about-reference-appointment-title">Ready to begin your healing journey?</h2>
            <a href="/appointment/" className="about-reference-appointment-link">
              Make an appointment <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <a className="about-reference-call" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Or call us at {phone}</a>
          </div>
        </div>
      </section>

      <DetailTestimonialsFaq showTestimonials={false} />

      {videoOpen && <div className="about-reference-video-modal" role="dialog" aria-modal="true" aria-label="Roar Wellness recovery film" onClick={(event) => {
        if (event.target === event.currentTarget) setVideoOpen(false);
      }}>
        <button ref={closeButtonRef} type="button" className="about-reference-video-close" onClick={() => setVideoOpen(false)} aria-label="Close video">
          <X size={24} aria-hidden="true" />
        </button>
        <div className="about-reference-video-frame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/YePcUkLmnyw?autoplay=1&rel=0"
            title="Roar Wellness — Transforming Lives & Overcoming Addiction"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>}
    </main>
  );
}
