"use client";

import Link from "next/link";
import { type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getCmsCategoryLabel, getCmsContentHref, getCmsRouteKind, isLocationService, isServiceCategory } from "@/lib/cms-routes";
import { normalizeCmsPlainText } from "@/lib/cms-text";
import { cmsRequest } from "@/services/cms-api";
import { DetailTestimonialsFaq } from "@/components/site/TestimonialsFaq";
import { AppointmentShowcase } from "@/components/site/AppointmentShowcase";
import { AppointmentRequestForm } from "@/components/site/AppointmentRequestForm";
import { AboutPage } from "@/components/site/AboutPage";
import { ContactSection } from "@/components/site/ContactSection";
import { GalleryVideoGrid } from "@/components/layout/GalleryVideoGrid";
import { GalleryLightbox } from "@/components/layout/GalleryLightbox";
import { galleryImages } from "@/lib/gallery-images";
import { getYouTubeVideos } from "@/lib/youtube-videos";

interface CmsItem {
  title: string;
  slug: string;
  category_id?: string;
  category_slug: string;
  category_name: string;
  excerpt?: string | null;
  summary?: string | null;
  description?: string | null;
  content?: string | null;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  featured_image_position?: string | null;
  image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

interface CmsCategory {
  id: string;
  name: string;
  slug: string;
}

interface ContentHeading {
  id: string;
  title: string;
}

function getCmsPageImages(html: string): string[] {
  const images = new Set<string>();
  const addImage = (value: string | undefined) => {
    if (!value) return;
    const source = value.trim().replace(/&amp;/g, "&");
    if (/^(https?:\/\/|\/(?!\/))/.test(source)) images.add(source);
  };

  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = tag[0];
    for (const name of ["src", "data-src", "data-lazy-src"]) {
      const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
      addImage(match?.[2]);
    }
  }
  for (const match of html.matchAll(/background-image\s*:\s*url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    addImage(match[2]);
  }
  return [...images];
}

const serviceHeroColorPalettes = [
  "linear-gradient(115deg, #3e372f 0%, #51483f 58%, #695f53 100%)",
  "linear-gradient(115deg, #3b3531 0%, #65594c 55%, #857361 100%)",
  "linear-gradient(115deg, #343933 0%, #4f5b4c 56%, #70806a 100%)",
  "linear-gradient(115deg, #39333b 0%, #5b4e60 56%, #786a7e 100%)",
];

function ServiceHeroBackground({ html, slug }: { html: string; slug: string }) {
  const images = useMemo(() => {
    if (slug === "alcohol-addiction") {
      return [
      "/images/alcohol-addiction-hero-01.jpg",
      "/images/alcohol-addiction-hero-02.jpg",
      "/images/alcohol-addiction-hero-03.jpg",
      ];
    }
    if (slug === "opioid-treatment") {
      return [
        "/images/opioid-treatment-hero-01.png",
        "/images/opioid-treatment-hero-02.png",
        "/images/opioid-treatment-hero-03.png",
      ];
    }
    if (slug === "heroin-addiction") {
      return [
        "/images/heroin-addiction-hero-01.png",
        "/images/heroin-addiction-hero-02.png",
        "/images/heroin-addiction-hero-03.png",
      ];
    }
    if (slug === "cannabis-treatment") {
      return [
        "/images/cannabis-treatment-hero-01.jpg",
        "/images/cannabis-treatment-hero-02.jpg",
        "/images/cannabis-treatment-hero-03.jpg",
      ];
    }
    if (slug === "cocaine-addiction") {
      return [
        "/images/cocaine-addiction-hero-01.jpg",
        "/images/cocaine-addiction-hero-02.jpg",
        "/images/cocaine-addiction-hero-03.jpg",
      ];
    }
    if (slug === "poly-substance-abuse") {
      return [
        "/images/poly-substance-abuse-hero-01.jpg",
        "/images/poly-substance-abuse-hero-02.jpg",
        "/images/poly-substance-abuse-hero-03.jpg",
      ];
    }
    const pageImages = getCmsPageImages(html);
    return pageImages.length ? pageImages : ["/images/facility-open-space.webp"];
  }, [html, slug]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const availableImages = images.filter((image) => !failedImages.has(image));
  const slideCount = availableImages.length;

  useEffect(() => {
    setActiveIndex(0);
    setFailedImages(new Set());
  }, [html]);

  useEffect(() => {
    if (slideCount < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slideCount);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slideCount]);

  return <div className={`detail-hero-background${availableImages.length ? " detail-hero-background-has-images" : ""}`} aria-hidden="true">
    {availableImages.length
      ? availableImages.map((image, index) => <img
        className={`detail-hero-background-slide${index === activeIndex ? " is-active" : ""}`}
        key={image}
        src={image}
        alt=""
        loading={index === 0 ? "eager" : "lazy"}
        onError={() => {
          setActiveIndex(0);
          setFailedImages((current) => new Set(current).add(image));
        }}
      />)
      : failedImages.has("/images/facility-open-space.webp")
        ? <div
          className="detail-hero-background-slide is-active"
          style={{ backgroundImage: serviceHeroColorPalettes[activeIndex % serviceHeroColorPalettes.length] }}
        />
        : <img
          className="detail-hero-background-slide is-active"
          src="/images/facility-open-space.webp"
          alt=""
          onError={() => setFailedImages((current) => new Set(current).add("/images/facility-open-space.webp"))}
        />}
  </div>;
}

const serviceImageFallbacks: Record<string, string> = {
  "atlaslogy-session": "/images/atlas-session.png",
  "nutritional-guidance": "/images/nutritional-guidance.png",
  "naturopathic-consultation": "/images/naturopathic-consultation.png",
  "mind-body-coaching": "/images/mind-body-coaching.png",
  "detox-drainage-therapy": "/images/detox-dranage-therapy.png",
  "pain-relief-therapy": "/images/pain-relief-therapy.png",
  "charas-deaddiction": "/images/Drug Addiction.png",
  "drug-rehabilitation-center-in-delhi-ncr": "/images/Drug Addiction.png",
  "rehab-center-in-india": "/images/Drug Addiction.png",
  "drugs-addiction": "/images/Drug Addiction.png",
  "de-addiction-treatment": "/images/Drug Addiction.png",
  "alcohol-addiction": "/images/Alcohol Addiction.png",
  "opioid-addiction": "/images/Opioid Addiction.png",
  "opioid-treatment": "/images/Opioid Addiction.png",
  "heroin-addiction": "/images/Heroine Addiction.png",
  "cocaine-addiction": "/images/Cocaine Addiction.png",
  "marijuana-addiction": "/images/Marijuana Addiction.png",
  "marijuana-treatment-in-delhi": "/images/Marijuana Addiction.png",
  "cannabis-treatment": "/images/Marijuana Addiction.png",
  "poly-substance-abuse": "/images/Poly Substance Abuse.png",
  "benzodiazepine-addiction": "/images/Benzodiazepine Addiction.png",
  "benzodiazepine-treatment": "/images/Benzodiazepine Addiction.png",
  "morphine-addiction": "/images/Morphine Addiction.png",
  "gambling-addiction": "/images/Gambling Addiction.png",
  "gambling-treatment": "/images/Gambling Addiction.png",
  "sex-addiction": "/images/sex Addiction.png",
  "game-therapy": "/images/game-therapy.webp",
  "yoga-and-meditation": "/images/facility-yoga-meditation.webp",
  "schizophrenia-treatment-in-delhi": "/images/Schizophrenia.png",
  "treatment-of-personality-disorders": "/images/Bipolar Disorder.png",
  "adhd-treatment-in-delhi": "/images/ADHD.png",
  "internet-addiction": "/images/game-therapy.webp",
};

function getServiceImageFallback(item: CmsItem) {
  if (serviceImageFallbacks[item.slug]) return serviceImageFallbacks[item.slug];
  if (item.slug.includes("rehab") || item.slug.includes("rehabilitation") || item.slug.includes("centre") || item.slug.includes("center")) {
    return "/images/facility-open-space.webp";
  }
  if (item.category_slug === "therapy") return "/images/game-therapy.webp";
  if (item.category_slug === "mental-healthcare") return "/images/recovery-at-your-pace.webp";
  return "/images/Drug Addiction.png";
}

function ServiceRecommendations({ items, currentSlug }: { items: CmsItem[]; currentSlug: string }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(items.length / 2);
  const visibleItems = items.slice(page * 2, page * 2 + 2);
  const canNavigate = pageCount > 1;
  const showPage = (nextPage: number) => setPage((nextPage + pageCount) % pageCount);

  useEffect(() => setPage(0), [currentSlug]);

  return <section className="service-pagination-section site-container px-5" aria-labelledby="service-pagination-title">
    <header className="service-pagination-header">
      <div className="service-pagination-heading">
        <p className="eyebrow">Keep exploring</p>
        <h2 id="service-pagination-title">More services</h2>
      </div>
      {canNavigate && <div className="service-pagination-controls" aria-label="Browse more services">
        <span aria-live="polite">{String(page + 1).padStart(2, "0")} <i /> {String(pageCount).padStart(2, "0")}</span>
        <button type="button" aria-label="Show previous services" onClick={() => showPage(page - 1)}>
          <ArrowLeft size={17} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Show next services" onClick={() => showPage(page + 1)}>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>}
    </header>
    <div className="service-recommendation-grid" aria-live="polite">
      {visibleItems.map((item) => {
        const excerpt = normalizeCmsPlainText(item.excerpt || item.summary || item.description || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return <Link className="service-recommendation-card" href={getCmsContentHref(item.slug, item.category_slug)} key={item.slug}>
          <img src={item.featured_image_url || item.image_url || getServiceImageFallback(item)} alt={item.featured_image_alt || ""} />
          <span className="service-recommendation-copy">
            <span className="service-recommendation-category">{getCmsCategoryLabel(item.category_slug)}</span>
            <strong>{item.title}</strong>
            {excerpt && <span className="service-recommendation-excerpt">{excerpt}</span>}
          </span>
          <span className="service-recommendation-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </Link>;
      })}
    </div>
  </section>;
}

function SubstanceAbuseGuide() {
  return <div className="substance-guide">
    <section className="substance-impact-section" aria-labelledby="substance-impact-title">
      <div className="substance-guide-heading">
        <p className="eyebrow">Understanding substance use</p>
        <h2 id="substance-impact-title">How can substance use affect everyday life?</h2>
        <p>Every person’s experience is different. Substance use can affect wellbeing and the people around someone; the type and extent of impact varies with each situation.</p>
      </div>
      <div className="substance-impact-grid">
        <article className="substance-impact-card">
          <span aria-hidden="true">01</span>
          <h3>Personal wellbeing</h3>
          <p>Changes in sleep, mood, health, or daily routines may be a sign that extra support could help.</p>
        </article>
        <article className="substance-impact-card">
          <span aria-hidden="true">02</span>
          <h3>Relationships</h3>
          <p>Communication, trust, and family responsibilities can come under strain. Compassionate support can help people talk through what is happening.</p>
        </article>
        <article className="substance-impact-card">
          <span aria-hidden="true">03</span>
          <h3>Work, studies &amp; community</h3>
          <p>Focus, attendance, finances, and social connections may be affected. A practical first step can be speaking with a qualified professional.</p>
        </article>
      </div>
    </section>

    <section className="substance-alcohol-panel" aria-labelledby="substance-alcohol-title">
      <div className="substance-alcohol-copy">
        <p className="eyebrow">A compassionate perspective</p>
        <h2 id="substance-alcohol-title">About alcohol use</h2>
        <p>Alcohol use may be worth discussing with a health professional when it feels difficult to control or starts affecting health, relationships, or everyday responsibilities. These experiences are not a diagnosis; a qualified professional can help someone understand their situation and options.</p>
        <Link href="/contact-us" className="substance-guide-link">Talk with our team <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="substance-alcohol-signs">
        <h3>Some reasons to reach out</h3>
        <ul>
          <li>Drinking more, or for longer, than intended</li>
          <li>Finding it difficult to cut down</li>
          <li>Continuing to drink despite problems in daily life</li>
        </ul>
        <p>If you are concerned about yourself or someone close to you, a confidential conversation with a qualified professional can help clarify next steps.</p>
      </div>
    </section>
  </div>;
}

const twelveStepPhases = [
  {
    range: "01–03",
    title: "Recognise & seek support",
    description: "Acknowledge that substance use has become difficult to manage, stay open to help, and consider what support could look like.",
    steps: [
      { number: "01", text: "Recognise the impact and limits of trying to manage alone." },
      { number: "02", text: "Allow room for hope and support beyond yourself." },
      { number: "03", text: "Choose to engage with a recovery path that fits your beliefs and needs." },
    ],
  },
  {
    range: "04–09",
    title: "Reflect & repair",
    description: "With guidance, look honestly at patterns, share that reflection with a trusted person, and take appropriate steps to repair harm.",
    steps: [
      { number: "04", text: "Take an honest personal inventory." },
      { number: "05", text: "Share reflections with a trusted guide or professional." },
      { number: "06", text: "Become willing to address unhelpful patterns." },
      { number: "07", text: "Seek help to put constructive changes into practice." },
      { number: "08", text: "Consider who may have been affected and how." },
      { number: "09", text: "Make amends where it is safe and appropriate to do so." },
    ],
  },
  {
    range: "10–12",
    title: "Practise & connect",
    description: "Continue regular reflection, nurture a source of meaning, and share encouragement with others when ready.",
    steps: [
      { number: "10", text: "Keep reviewing choices and make timely repairs." },
      { number: "11", text: "Develop a regular practice of reflection or spiritual connection." },
      { number: "12", text: "Carry lessons forward and offer support to others in recovery." },
    ],
  },
];

function TwelveStepProgramGuide() {
  return <div className="twelve-step-guide">
    <section className="twelve-step-intro" aria-labelledby="twelve-step-intro-title">
      <div>
        <p className="eyebrow">A peer-support framework</p>
        <h2 id="twelve-step-intro-title">A path built on reflection, connection, and continued support.</h2>
      </div>
      <p>The 12-step approach is a structured peer-support framework used by some recovery communities. People experience it differently, and it may be combined with professional treatment. It is not the only route to recovery.</p>
    </section>

    <section className="twelve-step-video" aria-labelledby="twelve-step-video-title">
      <div className="twelve-step-video-copy">
        <p className="eyebrow">Start with understanding</p>
        <h2 id="twelve-step-video-title">Who is an alcoholic?</h2>
        <p>Watch the original Roar Wellness video, then explore the framework below at your own pace.</p>
      </div>
      <GalleryVideoGrid
        videos={[{ id: "wH275G1VsKM", title: "Who is an alcoholic? | Roar Wellness" }]}
        gridClassName="twelve-step-video-grid"
      />
    </section>

    <section className="twelve-step-phases" aria-labelledby="twelve-step-phases-title">
      <header className="twelve-step-section-heading">
        <p className="eyebrow">The framework at a glance</p>
        <h2 id="twelve-step-phases-title">Twelve steps, three broad phases</h2>
        <p>This is a plain-language overview, not a substitute for a programme guide or support from a qualified professional.</p>
      </header>
      <div className="twelve-step-phase-grid">
        {twelveStepPhases.map((phase) => (
          <article className="twelve-step-phase-card" key={phase.range}>
            <span className="twelve-step-phase-range">STEPS {phase.range}</span>
            <h3>{phase.title}</h3>
            <p className="twelve-step-phase-description">{phase.description}</p>
            <ol>
              {phase.steps.map((step) => <li key={step.number}><span aria-hidden="true">{step.number}</span>{step.text}</li>)}
            </ol>
          </article>
        ))}
      </div>
    </section>

    <aside className="twelve-step-note" aria-label="Choosing recovery support">
      <div>
        <p className="eyebrow">Your recovery is personal</p>
        <h2>Find support that respects your needs.</h2>
        <p>Peer groups, counselling, medical care, and other supports can play different roles. A qualified professional can help you discuss safe and suitable options for your circumstances.</p>
      </div>
      <Link href="/contact-us" className="substance-guide-link">Talk with our team <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </aside>
  </div>;
}

const aaReflectionQuestions = [
  "Do you lose time from work because of drinking or substance use?",
  "Is drinking or substance use making your home life unhappy?",
  "Do you use or drink because you feel shy or uncomfortable with other people?",
  "Is drinking or substance use affecting your reputation?",
  "Have you ever felt remorse after drinking or using?",
  "Have you had financial difficulties as a result of drinking or substance use?",
  "Do you turn to people or places that concern you when drinking or using?",
  "Does drinking or substance use make you less attentive to your family's wellbeing?",
  "Has your ambition or interest in activities decreased since drinking or using?",
  "Do you feel a strong urge to drink or use at a particular time?",
  "Has your efficiency or ability to manage daily tasks decreased?",
  "Is drinking or substance use putting your job or business at risk?",
  "Do you drink or use to escape worries or troubles?",
  "Do you drink or use alone?",
  "Have you ever had a memory lapse after drinking or using?",
  "Has a physician ever treated you for concerns related to drinking or substance use?",
  "Do you drink or use to feel more confident?",
  "Have you ever been in a hospital or institution because of drinking or substance use?",
  "Have you tried to cut down or stop and found it difficult?",
  "Have you continued drinking or using despite problems it caused?",
];

function AaTwentyQuestionsGuide() {
  const [answers, setAnswers] = useState<Record<number, "yes" | "no">>({});
  const answeredCount = Object.keys(answers).length;
  const yesCount = Object.values(answers).filter((answer) => answer === "yes").length;

  return <div className="aa-reflection-guide">
    <section className="aa-reflection-intro" aria-labelledby="aa-reflection-title">
      <div>
        <p className="eyebrow">A private moment of reflection</p>
        <h2 id="aa-reflection-title">Take these questions one at a time.</h2>
      </div>
      <div className="aa-reflection-intro-copy">
        <p>These questions are a prompt to reflect on how drinking or substance use may be affecting life. They are not a diagnostic test, and your answers stay in this page only.</p>
        <a href="#aa-reflection-questions">Begin the self-check <ArrowDown size={15} aria-hidden="true" /></a>
      </div>
    </section>

    <section className="aa-reflection-tool" id="aa-reflection-questions" aria-labelledby="aa-reflection-list-title">
      <header className="aa-reflection-toolbar">
        <div>
          <p className="eyebrow">No score. No judgement.</p>
          <h2 id="aa-reflection-list-title">20 questions to consider</h2>
        </div>
        <div className="aa-reflection-progress" aria-live="polite">
          <span>{answeredCount} <span>/ 20 answered</span></span>
          <div
            className="aa-reflection-progress-track"
            role="progressbar"
            aria-label="Questions answered"
            aria-valuemin={0}
            aria-valuemax={20}
            aria-valuenow={answeredCount}
          ><span style={{ width: `${answeredCount * 5}%` }} /></div>
        </div>
      </header>

      <ol className="aa-question-list">
        {aaReflectionQuestions.map((question, index) => {
          const answer = answers[index];
          return <li className={`aa-question-card${answer ? " is-answered" : ""}`} key={question}>
            <span className="aa-question-number">{String(index + 1).padStart(2, "0")}</span>
            <p>{question}</p>
            <div className="aa-answer-options" role="group" aria-label={`Answer question ${index + 1}`}>
              {(["yes", "no"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={answer === option}
                  onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}
                >{option === "yes" ? "Yes" : "No"}</button>
              ))}
            </div>
          </li>;
        })}
      </ol>

      {answeredCount > 0 && <aside className="aa-reflection-response" aria-live="polite">
        <span className="aa-reflection-response-count">{yesCount}</span>
        <div>
          <h3>{answeredCount === 20 ? "Thank yourself for taking the time." : "Your reflection is yours."}</h3>
          <p>{answeredCount === 20
            ? "There is no pass or fail and this count does not indicate a diagnosis. If any answer leaves you concerned, consider speaking with a qualified health professional."
            : `${answeredCount} of 20 answered. Your responses are not saved or sent anywhere.`}</p>
        </div>
        <button type="button" className="aa-reflection-reset" onClick={() => setAnswers({})}>Clear answers</button>
      </aside>}
    </section>

    <section className="aa-reflection-video" aria-labelledby="aa-reflection-video-title">
      <div className="aa-reflection-video-copy">
        <p className="eyebrow">A little more context</p>
        <h2 id="aa-reflection-video-title">What is Addiction?</h2>
        <p>Watch this short Roar Wellness video as another starting point for learning and reflection.</p>
      </div>
      <GalleryVideoGrid
        videos={[{ id: "1XJE-buAzyM", title: "What is Addiction | Roar Wellness" }]}
        gridClassName="aa-reflection-video-grid"
      />
    </section>

    <aside className="aa-reflection-support">
      <div>
        <p className="eyebrow">You don’t have to figure it out alone</p>
        <h2>A conversation can be a first step.</h2>
        <p>If you have concerns about your drinking or substance use, a qualified professional can help you explore support options without judgement.</p>
      </div>
      <Link href="/contact-us" className="substance-guide-link">Talk with our team <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </aside>
  </div>;
}

function CmsPageContent({
  html,
  slug,
  featuredImage,
  featuredImageAlt = "",
  featuredImagePosition = "50% 50%",
  centerMedia = false,
  inlineCta = false,
  blogHelpline = false,
  onHeadings,
}: {
  html: string;
  slug: string;
  featuredImage?: string | null;
  featuredImageAlt?: string;
  featuredImagePosition?: string;
  centerMedia?: boolean;
  inlineCta?: boolean;
  blogHelpline?: boolean;
  onHeadings?: Dispatch<SetStateAction<ContentHeading[]>>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    onHeadings?.((current) => current.length ? [] : current);

    const removeEmbeddedSections = () => {
      ["Our Therapy", "Other Services"].forEach((headingText) => {
        const heading = Array.from(content.querySelectorAll<HTMLElement>("h2, h3, h4"))
          .find((element) => element.textContent?.trim() === headingText);
        if (!heading) return;

        let section = heading.parentElement;
        while (section && section !== content) {
          if (section.matches(".e-con") && section.querySelector("a")) break;
          section = section.parentElement;
        }
        if (section && section !== content) section.remove();
      });

      const pageRoot = content.querySelector<HTMLElement>(":scope > .elementor") || content;
      const sections = Array.from(pageRoot.querySelectorAll<HTMLElement>(
        ".e-con.e-parent, .elementor-section, .elementor-top-section"
      ));
      sections.forEach((section) => {
        const headings = Array.from(section.querySelectorAll<HTMLElement>("h1, h2, h3, h4"))
          .map((heading) => heading.textContent?.trim() || "");
        const containsSharedSection = headings.some((heading) =>
          /testimonial|client.s say|frequently asked questions|^faq'?s?$/i.test(heading)
          || /^(let[’']s talk[!.]?|take the first step\.?)$/i.test(heading)
        );
        const containsEmbeddedWidget = Boolean(section.querySelector(
          ".elementor-widget-reviews, .elementor-widget-testimonial, .elementor-widget-testimonial-carousel, .elementor-widget-form, .elementor-form, .accordion"
        ));
        if (!containsSharedSection && !containsEmbeddedWidget) return;

        const previous = section.previousElementSibling;
        if (previous instanceof HTMLElement
          && previous.matches(".e-con.e-parent, .elementor-section, .elementor-top-section")
          && /testimonial|client.s say/i.test(previous.textContent || "")) {
          previous.remove();
        }
        section.remove();
      });

      if (inlineCta) {
        const fragmentNavigationSections = Array.from(pageRoot.querySelectorAll<HTMLElement>(".e-con.e-parent"))
          .filter((section) => {
            if (section.querySelector("h1, h2, h3, h4")) return false;
            const links = Array.from(section.querySelectorAll<HTMLAnchorElement>("a"));
            const fragmentLinks = links.filter((link) => link.getAttribute("href")?.startsWith("#"));
            const widgets = Array.from(section.querySelectorAll<HTMLElement>(".elementor-widget"));
            return fragmentLinks.length >= 2
              && fragmentLinks.length === links.length
              && fragmentLinks.every((link) => link.closest(".elementor-widget-button"))
              && widgets.length > 0
              && widgets.every((widget) => widget.classList.contains("elementor-widget-button"));
          });
        fragmentNavigationSections.forEach((section) => section.remove());

        const seenHeadings = new Set<string>();
        Array.from(pageRoot.querySelectorAll<HTMLElement>("h1")).forEach((heading) => {
          const normalizedTitle = heading.textContent?.trim().replace(/\s+/g, " ").toLowerCase() || "";
          if (!normalizedTitle) return;
          if (!seenHeadings.has(normalizedTitle)) {
            seenHeadings.add(normalizedTitle);
            return;
          }
          const duplicate = heading.closest<HTMLElement>(".elementor-widget-heading") || heading;
          duplicate.remove();
        });
      }

      if (inlineCta && featuredImage) {
        const heading = pageRoot.querySelector<HTMLElement>("h1");
        if (heading) {
          const headingBlock = heading.closest<HTMLElement>(".elementor-widget-heading") || heading;
          let figure = pageRoot.querySelector<HTMLElement>(".service-article-featured-image");
          if (!figure) {
            figure = document.createElement("figure");
            const image = document.createElement("img");
            figure.className = "service-article-featured-image";
            image.alt = featuredImageAlt;
            image.loading = "lazy";
            figure.append(image);
          }
          const image = figure.querySelector("img");
          if (image) {
            image.src = featuredImage;
            image.alt = featuredImageAlt;
            image.style.objectPosition = featuredImagePosition;
          }
          if (figure.parentElement !== headingBlock.parentElement || headingBlock.nextElementSibling !== figure) {
            headingBlock.insertAdjacentElement("afterend", figure);
          }
        }
      }
    };

    const syncContent = () => {
      removeEmbeddedSections();
      if (blogHelpline && !content.querySelector(".blog-helpline-card")) {
        const helplineHeading = Array.from(content.querySelectorAll<HTMLElement>("h2, h3, h4"))
          .find((heading) => /^RoarWellness Helpline:/i.test(heading.textContent?.trim() || ""));
        if (helplineHeading) {
          const details = (helplineHeading.innerText || helplineHeading.textContent || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(1);
          const contactItems = details.map((value) => {
            if (/^\+?[\d\s().-]{7,}$/.test(value)) {
              return { label: "Call us", value, href: `tel:${value.replace(/[^\d+]/g, "")}` };
            }
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return { label: "Email us", value, href: `mailto:${value}` };
            }
            const domain = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
            return /^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(domain)
              ? { label: "Visit our website", value, href: `https://${domain}` }
              : null;
          }).filter((item): item is { label: string; value: string; href: string } => item !== null);

          if (contactItems.length) {
            const card = document.createElement("section");
            const header = document.createElement("div");
            const eyebrow = document.createElement("p");
            const links = document.createElement("div");
            card.className = "blog-helpline-card";
            header.className = "blog-helpline-header";
            eyebrow.className = "blog-helpline-eyebrow";
            eyebrow.textContent = "We're here when you need us";
            helplineHeading.className = `${helplineHeading.className} blog-helpline-title`.trim();
            helplineHeading.textContent = "RoarWellness Helpline";
            links.className = "blog-helpline-links";
            card.setAttribute("aria-label", "RoarWellness helpline contact details");
            helplineHeading.replaceWith(card);
            header.append(eyebrow, helplineHeading);
            contactItems.forEach(({ label, value, href }) => {
              const link = document.createElement("a");
              const type = document.createElement("span");
              const detail = document.createElement("span");
              link.href = href;
              link.className = "blog-helpline-link";
              if (href.startsWith("https://")) {
                link.target = "_blank";
                link.rel = "noreferrer";
              }
              type.className = "blog-helpline-link-type";
              type.textContent = label;
              detail.className = "blog-helpline-link-value";
              detail.textContent = value;
              link.append(type, detail);
              links.append(link);
            });
            card.append(header, links);
          }
        }
      }
      const articleTitle = content.querySelector<HTMLElement>("h1");
      const contentHeadings = Array.from(content.querySelectorAll<HTMLElement>("h1, h2, h3"))
        .filter((heading) => heading !== articleTitle)
        .filter((heading) => !heading.closest(".service-inline-cta"));
      const usedIds = new Set<string>();
      const tocHeadings = contentHeadings.map((heading, index) => {
        const title = heading.textContent?.trim() || "";
        const sluggedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const baseId = heading.id || `service-section-${sluggedTitle || index + 1}`;
        let id = baseId;
        let suffix = 2;
        while (usedIds.has(id)) {
          id = `${baseId}-${suffix}`;
          suffix += 1;
        }
        if (heading.id !== id) heading.id = id;
        usedIds.add(id);
        return { id, title };
      }).filter((heading) => heading.title);
      onHeadings?.((current) => current.length === tocHeadings.length
        && current.every((heading, index) => heading.id === tocHeadings[index].id && heading.title === tocHeadings[index].title)
        ? current
        : tocHeadings);

      if (inlineCta) {
        let cta = content.querySelector<HTMLElement>(".service-inline-cta");
        if (!cta) {
          cta = document.createElement("section");
          const copy = document.createElement("div");
          const kicker = document.createElement("p");
          const title = document.createElement("h2");
          const description = document.createElement("p");
          const link = document.createElement("a");
          const arrow = document.createElement("span");
          cta.className = "service-inline-cta";
          copy.className = "service-inline-cta-copy";
          kicker.className = "service-inline-cta-kicker";
          kicker.textContent = "A thoughtful next step";
          title.id = `service-inline-cta-title-${slug}`;
          title.textContent = "You don’t have to figure this out alone.";
          description.textContent = "Talk with our team about care that feels right for you. Your first conversation is private and without pressure.";
          link.href = "tel:+919319977207";
          link.append(document.createTextNode("Speak with our team "));
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "→";
          link.append(arrow);
          copy.append(kicker, title, description, link);
          cta.setAttribute("aria-labelledby", title.id);
          cta.append(copy);
        }
        const targetHeadingIndex = Math.min(1, contentHeadings.length - 1);
        const targetHeading = targetHeadingIndex >= 0 ? contentHeadings[targetHeadingIndex] : null;
        const followingHeading = targetHeadingIndex >= 0 ? contentHeadings[targetHeadingIndex + 1] : null;
        const pageRoot = content.querySelector<HTMLElement>(":scope > .elementor") || content;
        const contentBlocks = Array.from(pageRoot.children).filter((element): element is HTMLElement =>
          element instanceof HTMLElement && !element.matches(".service-inline-cta")
        );
        const getTopLevelBlock = (element: HTMLElement) => {
          let block = element;
          while (block.parentElement && block.parentElement !== pageRoot) block = block.parentElement;
          return block.parentElement === pageRoot ? block : null;
        };
        const targetBlock = targetHeading ? getTopLevelBlock(targetHeading) : null;
        const followingBlock = followingHeading ? getTopLevelBlock(followingHeading) : null;
        const insertBefore = (parent: HTMLElement, reference: HTMLElement) => {
          if (cta.parentElement !== parent || cta.nextElementSibling !== reference) parent.insertBefore(cta, reference);
        };
        const insertAfter = (reference: HTMLElement) => {
          if (reference.nextElementSibling !== cta) reference.insertAdjacentElement("afterend", cta);
        };

        if (targetHeading && followingHeading) {
          let commonParent: HTMLElement | null = targetHeading.parentElement;
          while (commonParent && commonParent !== pageRoot && !commonParent.contains(followingHeading)) {
            commonParent = commonParent.parentElement;
          }
          const followingHeadingBlock = followingHeading.closest<HTMLElement>(".elementor-widget-heading") || followingHeading;
          const followingHeadingParent = followingHeadingBlock.parentElement;
          if (commonParent && followingHeadingParent && commonParent.contains(followingHeadingBlock)) {
            insertBefore(followingHeadingParent, followingHeadingBlock);
          } else if (followingBlock && followingBlock !== targetBlock) {
            insertBefore(pageRoot, followingBlock);
          } else if (targetBlock) {
            insertAfter(targetBlock);
          } else {
            if (cta.parentElement !== content) content.append(cta);
          }
        } else if (followingBlock && followingBlock !== targetBlock) insertBefore(pageRoot, followingBlock);
        else if (targetBlock) insertAfter(targetBlock);
        else if (contentBlocks.length) insertAfter(contentBlocks[Math.floor(contentBlocks.length / 2)]);
        else if (cta.parentElement !== content) content.append(cta);
      }
    };

    syncContent();
    const observer = new MutationObserver(syncContent);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [blogHelpline, html, inlineCta, onHeadings, slug]);

  const toggleFaq = (title: HTMLElement) => {
    const panel = title.parentElement?.querySelector<HTMLElement>(".accordion-content");
    if (!panel) return;

    const expanded = title.getAttribute("aria-expanded") === "true";
    const panelIndex = [...title.closest(".cms-page-content")!.querySelectorAll(".accordion-title")].indexOf(title) + 1;
    const panelId = `cms-faq-${slug}-${panelIndex}`;
    title.removeAttribute("onclick");
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-controls", panelId);
    title.setAttribute("aria-expanded", String(!expanded));
    title.id = `${panelId}-trigger`;
    title.classList.toggle("active", !expanded);
    panel.id = panelId;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", title.id);
    panel.style.setProperty("display", expanded ? "none" : "block", "important");
    panel.style.setProperty("padding", expanded ? "0" : "0 0 1.1rem", "important");
    panel.style.setProperty("max-height", expanded ? "0px" : "none", "important");
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const title = target.closest(".accordion-title");
    if (!title || !event.currentTarget.contains(title)) return;
    event.preventDefault();
    event.stopPropagation();
    toggleFaq(title as HTMLElement);
  };

  const onKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const title = target.closest(".accordion-title");
    if (!title || !event.currentTarget.contains(title) || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    toggleFaq(title as HTMLElement);
  };

  return <div
    ref={contentRef}
    className={`cms-page-content${slug === "drug-alcohol-rehabilitation-experts" ? " cms-experts-page" : ""}${centerMedia ? " cms-centered-media" : ""}`}
    onClickCapture={onClickCapture}
    onKeyDownCapture={onKeyDownCapture}
    dangerouslySetInnerHTML={{ __html: html }}
  />;
}

type DetailKind = "service" | "blog" | "page";
type ListingKind = "all" | "services";

interface ContactSettings {
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  contactAddress?: string;
}

export default function InnerPagesPage({
  detailSlug,
  detailKind,
  listingKind = "all",
}: {
  detailSlug?: string;
  detailKind?: DetailKind;
  listingKind?: ListingKind;
}) {
  const [cmsEntries, setCmsEntries] = useState<CmsItem[]>([]);
  const [categories, setCategories] = useState<CmsCategory[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(detailSlug ?? null);
  const [selectedItem, setSelectedItem] = useState<CmsItem | null>(null);
  const [serviceHeadings, setServiceHeadings] = useState<ContentHeading[]>([]);
  const [pagesMessage, setPagesMessage] = useState("Loading published content...");
  const [detailMessage, setDetailMessage] = useState("Loading page...");
  const [contactSettings, setContactSettings] = useState<ContactSettings>({});
  const contactEmail = contactSettings.contactEmail || "help@roarwellness.org";
  const contactPhone = contactSettings.contactPhone || "+919319977207";
  const contactWhatsApp = contactSettings.contactWhatsApp || "+919773890499";
  const contactAddress = contactSettings.contactAddress
    || "Akhil Farm, 1 Daisy Lane, Off Central Drive, DLF Chattarpur Farms, New Delhi 110074, India";

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: ContactSettings }>("/api/content/settings")
      .then(({ data }) => { if (mounted) setContactSettings(data); })
      .catch((error: unknown) => console.error("Unable to load contact settings.", error));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (detailSlug || listingKind === "services") return;
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (requestedCategory) setCategory(requestedCategory);
    let mounted = true;
    Promise.all([
      cmsRequest<{ data: CmsItem[] }>("/api/cms/content"),
      cmsRequest<{ data: CmsCategory[] }>("/api/cms/categories"),
    ])
      .then(([contentResult, categoryResult]) => {
        if (!mounted) return;
        setCmsEntries(contentResult.data);
        setCategories(categoryResult.data);
        setPagesMessage(contentResult.data.length ? "" : "No content has been published yet.");
      })
      .catch((error: unknown) => {
        if (mounted) setPagesMessage(error instanceof Error ? error.message : "Published content is temporarily unavailable.");
      });

    return () => { mounted = false; };
  }, [detailSlug, listingKind]);

  useEffect(() => {
    const slug = detailSlug || new URLSearchParams(window.location.search).get("slug");
    if (!slug) return;
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";

    let mounted = true;
    setSelectedSlug(slug);
    const encodedSlug = encodeURIComponent(slug);
    const kind = detailKind ?? "service";
    const endpoint = kind === "blog" ? "blog" : kind === "page" ? "pages" : "services";
    if (kind === "service") {
      cmsRequest<{ data: CmsItem[] }>("/api/content/services?all=1")
        .then(({ data }) => { if (mounted) setCmsEntries(data); })
        .catch((error: unknown) => console.error("Unable to load related services.", error));
    } else if (kind === "blog") {
      cmsRequest<{ data: CmsItem[] }>("/api/content/blog")
        .then(({ data }) => { if (mounted) setCmsEntries(data); })
        .catch((error: unknown) => console.error("Unable to load related articles.", error));
    }
    (preview
      ? cmsRequest<{ data: CmsItem }>(`/api/cms/preview/${encodedSlug}`)
      : cmsRequest<{ data: CmsItem }>(`/api/content/${endpoint}/${encodedSlug}`)
    )
      .then(({ data }) => {
        if (!mounted) return;
        setSelectedItem(data);
        setDetailMessage("");
      })
      .catch(() => {
        if (!mounted) return;
        if (preview) {
          setDetailMessage("Preview is unavailable. Sign in to the CMS and check that the content was saved.");
          return;
        }
        setDetailMessage("This page is temporarily unavailable.");
      });

    return () => { mounted = false; };
  }, [detailSlug, detailKind]);

  useEffect(() => {
    if (listingKind !== "services") return;
    let mounted = true;
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (requestedCategory && isServiceCategory(requestedCategory)) setCategory(requestedCategory);
    cmsRequest<{ data: CmsItem[] }>("/api/content/services?all=1")
      .then(({ data }) => {
        if (!mounted) return;
        setCmsEntries(data);
        setCategories(["treatments", "therapy", "mental-healthcare"].map((slug) => ({
          id: slug,
          slug,
          name: getCmsCategoryLabel(slug),
        })));
        setPagesMessage(data.length ? "" : "No services have been published yet.");
      })
      .catch((error: unknown) => {
        if (mounted) setPagesMessage(error instanceof Error ? error.message : "Published services are temporarily unavailable.");
      });
    return () => { mounted = false; };
  }, [listingKind]);

  useEffect(() => {
    if (!selectedItem || !selectedSlug) return;
    const title = selectedItem.seo_title || `${selectedItem.title} | Roar Wellness`;
    document.title = title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }
    if (selectedItem.seo_description || selectedItem.summary || selectedItem.excerpt) {
      description.content = normalizeCmsPlainText(selectedItem.seo_description || selectedItem.summary || selectedItem.excerpt || "");
    }
  }, [selectedItem, selectedSlug]);

  const allItems = listingKind === "services" ? cmsEntries.filter((item) => isServiceCategory(item.category_slug)) : cmsEntries;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = allItems.filter((item) => {
    const matchesCategory = !category || item.category_slug === category;
    const matchesSearch = `${item.title} ${item.excerpt ?? item.summary ?? ""}`.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  if (selectedSlug) {
    const isVideosPage = selectedItem?.slug === "videos";
    const isExpertsPage = selectedSlug.toLowerCase() === "drug-alcohol-rehabilitation-experts";
    const isAboutPage = selectedSlug === "about-roarwellness";
    const isFacilityPage = selectedSlug.toLowerCase() === "facility";
    const isTwelveStepPage = selectedSlug.toLowerCase() === "12-step-program-delhi";
    const isAaQuestionsPage = selectedSlug.toLowerCase() === "aa-20-questions";
    const summary = isExpertsPage
      ? "Meet the experienced clinicians and recovery professionals who guide care at Roar Wellness."
      : isTwelveStepPage
        ? "Explore a balanced introduction to the 12-step peer-support framework and the role connection can play in recovery."
      : isAaQuestionsPage
        ? "A private, non-diagnostic set of questions to help you reflect on how drinking or substance use may be affecting everyday life."
      : !isVideosPage && (selectedItem?.excerpt || selectedItem?.summary)
        ? normalizeCmsPlainText(selectedItem.excerpt || selectedItem.summary || "")
        : null;
    const pageVideos = isVideosPage
      ? getYouTubeVideos(selectedItem?.excerpt, selectedItem?.summary, selectedItem?.content, selectedItem?.description)
      : [];
    const isSubstanceAbusePage = selectedSlug.toLowerCase() === "about-substance-abuse";
    const selectedCategorySlug = selectedItem?.category_slug;
    const selectedKind = detailKind ?? (selectedItem ? getCmsRouteKind(selectedItem.category_slug) : "service");
    const image = selectedItem?.featured_image_url || selectedItem?.image_url;
    const heroImage = selectedKind === "service" ? null : image;
    const selectedCategory = selectedItem ? getCmsCategoryLabel(selectedItem.category_slug) : "Content";
    const relatedItems = allItems
      .filter((item) => item.slug !== selectedSlug && item.category_slug === selectedCategorySlug)
      .slice(0, 4);
    const serviceCategoryRecommendations = [
      { slug: "therapy", label: "Therapy" },
      { slug: "treatments", label: "Treatments" },
    ].map((category) => ({
      ...category,
      items: allItems
        .filter((item) => item.slug !== selectedSlug && item.category_slug === category.slug)
        .slice(0, 4),
    }));
    const serviceItems = allItems.filter((item) => isServiceCategory(item.category_slug));
    const serviceIndex = serviceItems.findIndex((item) => item.slug === selectedSlug);
    const breadcrumb = selectedItem && <nav aria-label="Breadcrumb" className="site-container mt-4 px-5">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brown-muted">
        <li><Link href="/" className="transition-colors hover:text-terracotta">Home</Link></li>
        {selectedKind !== "page" && <li aria-hidden="true" className="text-beige">/</li>}
        {selectedKind === "service" && <>
          <li><Link href="/services/" className="transition-colors hover:text-terracotta">Services</Link></li>
          <li aria-hidden="true" className="text-beige">/</li>
          <li><Link href={`/services/?category=${encodeURIComponent(selectedCategorySlug || "")}`} className="transition-colors hover:text-terracotta">{selectedCategory}</Link></li>
        </>}
        {selectedKind === "blog" && <>
          <li><Link href="/blog/" className="transition-colors hover:text-terracotta">Blog</Link></li>
        </>}
        <li aria-hidden="true" className="text-beige">/</li>
        <li aria-current="page" className="font-semibold text-brown">{selectedItem.title}</li>
      </ol>
    </nav>;

    if (selectedItem && selectedKind === "page" && selectedSlug.toLowerCase() === "contact-us") {
      return (
        <main className="contact-page">
          <section className="contact-page-hero" aria-labelledby="contact-page-title">
            <div className="site-container">
              <div className="contact-page-hero-top">
                <p className="contact-page-hero-kicker">Contact</p>
                <a href="#contact-details" aria-label="Explore our contact details"><ArrowDown size={22} aria-hidden="true" /></a>
              </div>
              <h1 id="contact-page-title">Get in <em>Touch</em></h1>
              <p>Start a conversation with Roar Wellness about care, recovery, and the next step for you or someone you care about.</p>
              <div className="contact-page-divider" aria-hidden="true"><span>+</span></div>
            </div>
          </section>
          <section id="contact-details" className="contact-details-showcase site-container" aria-labelledby="contact-details-title">
            <div className="contact-details-image">
              <img src="/images/about-roar-wellness.webp" alt="A welcoming space at Roar Wellness" />
              <span>Roar Wellness · Chhattarpur, Delhi</span>
            </div>
            <div className="contact-details-copy">
              <p className="eyebrow">We’re here to listen</p>
              <h2 id="contact-details-title">A thoughtful first conversation can make all the difference.</h2>
              <p className="contact-details-intro">Connect with our team in the way that feels most comfortable. Your enquiry will be treated with care and discretion.</p>
              <div className="contact-details-list">
                <div className="contact-details-row">
                  <MapPin aria-hidden="true" />
                  <div><span>Visit us</span><p>{contactAddress}</p><a href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`} target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={14} aria-hidden="true" /></a></div>
                </div>
                <div className="contact-details-row">
                  <Phone aria-hidden="true" />
                  <div><span>Call us</span><a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>{contactPhone}</a></div>
                </div>
                <div className="contact-details-row">
                  <Mail aria-hidden="true" />
                  <div><span>Email us</span><a href={`mailto:${contactEmail}`}>{contactEmail}</a></div>
                </div>
                <div className="contact-details-row">
                  <MessageCircle aria-hidden="true" />
                  <div><span>WhatsApp</span><a href={`https://wa.me/${contactWhatsApp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{contactWhatsApp}</a></div>
                </div>
              </div>
            </div>
          </section>
          <AppointmentShowcase phone={contactPhone} />
          <DetailTestimonialsFaq showTestimonials={false} />
        </main>
      );
    }

    if (isAboutPage) return <AboutPage phone={contactPhone} />;

    return (
      <main className={`pt-32 pb-20 md:pb-24${selectedSlug ? " detail-content-theme" : ""}`}>
        {selectedItem ? <>
          <section className={`detail-hero-band mt-6${selectedKind === "service" ? " detail-service-hero-band" : !heroImage ? " detail-hero-band-fallback-image" : ""}`} aria-labelledby="treatment-detail-title">
            {selectedKind === "service" && <ServiceHeroBackground html={selectedItem.content || selectedItem.description || ""} slug={selectedSlug} />}
            <div className="site-container px-5">
              <div className={`detail-hero${heroImage ? "" : " detail-hero-no-media"}${selectedKind === "blog" ? " detail-hero-editorial" : ""}`}>
              <div className="detail-hero-copy">
                <p className="detail-hero-kicker">{isExpertsPage ? "Meet the people behind your care" : selectedKind === "blog" ? "From the Roar Wellness journal" : selectedKind === "page" ? selectedCategory : selectedItem && isLocationService(selectedItem.slug) ? "Care close to home" : "Treatment and recovery"}</p>
                <h1 id="treatment-detail-title" className="detail-hero-title">{selectedItem.title}</h1>
                {summary && <p className="detail-hero-summary">{summary}</p>}
                {selectedKind === "service" && <a className="detail-hero-cta" href="tel:+919319977207">Speak with our team <span aria-hidden="true">›</span></a>}
                {selectedKind === "blog" && <Link className="detail-hero-cta" href="/blog">Explore more articles <span aria-hidden="true">›</span></Link>}
                {selectedKind === "service" && <p className="detail-hero-note">Private, supportive, and without obligation</p>}
              </div>
              {heroImage && <div className={`detail-hero-media${selectedKind === "blog" ? " detail-hero-media-editorial blog-hero-image-frame" : ""}`}><img src={heroImage} alt={selectedItem.featured_image_alt || ""} style={{ objectPosition: selectedItem.featured_image_position || "50% 50%" }} className="detail-hero-image" /></div>}
              </div>
            </div>
          </section>
          {breadcrumb}

          <div className="site-container px-5">
            <div className={`detail-layout ${selectedKind === "service" || selectedKind === "blog" || isFacilityPage ? "" : "detail-layout-full"}${selectedKind === "service" ? " detail-service-layout" : ""}${isFacilityPage ? " detail-facility-layout" : ""} mt-10 md:mt-14`}>
              {(selectedKind === "service" || isFacilityPage) && <aside className="service-detail-left" aria-label={isFacilityPage ? "Facility guide and stay" : "On this page and care approach"}>
                {serviceHeadings.length > 0 && <nav className="service-toc-card" aria-label="On this page">
                  <p className="eyebrow">{isFacilityPage ? "Explore the facility" : "Explore this guide"}</p>
                  <h2>On this page</h2>
                  <ol>{serviceHeadings.map((heading, index) => <li key={heading.id}>
                    <a href={`#${encodeURIComponent(heading.id)}`}><span>{String(index + 1).padStart(2, "0")}</span>{heading.title}</a>
                  </li>)}</ol>
                </nav>}

                <section className="service-path-card" aria-labelledby="service-path-title">
                  <p className="eyebrow">{isFacilityPage ? "A supportive stay" : "Our approach"}</p>
                  <h2 id="service-path-title">{isFacilityPage ? "Space to settle and reconnect" : "Care, one step at a time"}</h2>
                  <ol>
                    {isFacilityPage ? <>
                      <li><span>01</span><div><strong>Arrive</strong><p>A calm, welcoming place to begin.</p></div></li>
                      <li><span>02</span><div><strong>Settle</strong><p>Comfortable spaces for everyday care.</p></div></li>
                      <li><span>03</span><div><strong>Reconnect</strong><p>Room to restore healthy routines.</p></div></li>
                    </> : <>
                      <li><span>01</span><div><strong>Listen</strong><p>We begin with your story.</p></div></li>
                      <li><span>02</span><div><strong>Plan</strong><p>Explore options together.</p></div></li>
                      <li><span>03</span><div><strong>Support</strong><p>Move forward at your pace.</p></div></li>
                    </>}
                  </ol>
                  <div className="service-path-orbit" aria-hidden="true"><span /><span /><span /></div>
                </section>
              </aside>}

              <article className="detail-article">
                {isSubstanceAbusePage && <section className="about-addiction-video" aria-labelledby="about-addiction-video-title">
                  <div className="about-addiction-video-copy">
                    <p className="eyebrow">Fact about substance</p>
                    <h2 id="about-addiction-video-title">What is Addiction?</h2>
                    <p>An introduction to addiction from Roar Wellness. Watch to learn more about the subject and start a thoughtful conversation about support and recovery.</p>
                  </div>
                  <GalleryVideoGrid
                    videos={[{ id: "1XJE-buAzyM", title: "What is Addiction" }]}
                    gridClassName="about-addiction-video-grid"
                  />
                </section>}
                {isSubstanceAbusePage
                  ? <SubstanceAbuseGuide />
                  : isTwelveStepPage
                    ? <TwelveStepProgramGuide />
                    : isAaQuestionsPage
                      ? <AaTwentyQuestionsGuide />
                  : isVideosPage
                  ? pageVideos.length
                    ? <GalleryVideoGrid videos={pageVideos} gridClassName="cms-videos-page-grid" />
                    : <p role="status">Videos are temporarily unavailable. Please check back soon.</p>
                  : (selectedItem.content || selectedItem.description) && <CmsPageContent
                    html={selectedItem.content || selectedItem.description || ""}
                    slug={selectedSlug}
                    featuredImage={selectedKind === "service" ? image : null}
                    featuredImageAlt={selectedItem.featured_image_alt || ""}
                    featuredImagePosition={selectedItem.featured_image_position || "50% 50%"}
                    centerMedia={selectedKind === "blog" || selectedKind === "service"}
                    inlineCta={selectedKind === "service"}
                    blogHelpline={selectedKind === "blog"}
                    onHeadings={selectedKind === "service" || isFacilityPage ? setServiceHeadings : undefined}
                  />}
              </article>

              <aside className={`detail-sidebar${selectedKind === "blog" ? " blog-detail-sidebar" : ""}`} aria-label={selectedKind === "blog" ? "Related articles and appointment request" : "Related information"}>
                {selectedKind === "service" && <section className="therapy-infographic-card" aria-labelledby="therapy-infographic-title">
                  <p className="eyebrow">Therapy at Roar</p>
                  <h2 id="therapy-infographic-title">A space to find your way forward.</h2>
                  <div className="therapy-infographic" aria-hidden="true">
                    <span className="therapy-infographic-ring therapy-infographic-ring-outer" />
                    <span className="therapy-infographic-ring therapy-infographic-ring-inner" />
                    <span className="therapy-infographic-core">You</span>
                    <span className="therapy-infographic-point therapy-infographic-point-one">Listen</span>
                    <span className="therapy-infographic-point therapy-infographic-point-two">Understand</span>
                    <span className="therapy-infographic-point therapy-infographic-point-three">Grow</span>
                  </div>
                  <p className="therapy-infographic-caption">Personalised care, grounded in connection and compassion.</p>
                </section>}

                {isFacilityPage && <section className="detail-sidebar-card facility-detail-card" aria-labelledby="facility-detail-card-title">
                  <p className="eyebrow">Inside Roar Wellness</p>
                  <h2 id="facility-detail-card-title">Explore our facility</h2>
                  <GalleryLightbox images={galleryImages}>
                    <div className="facility-detail-gallery">
                      {galleryImages.map((image, index) => (
                        <button
                          key={image}
                          type="button"
                          className="facility-detail-gallery-item"
                          data-gallery-index={index}
                          aria-label={`Open facility photo ${index + 1}`}
                        >
                          <img src={image} alt={`Roar Wellness facility photo ${index + 1}`} loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </GalleryLightbox>
                  <a className="detail-browse-link" href="/gallery/">Explore the facility gallery <span aria-hidden="true">→</span></a>
                </section>}

                {selectedKind === "blog" && relatedItems.length > 0 && <nav className="detail-sidebar-card blog-related-card" aria-labelledby="blog-related-title">
                  <p className="eyebrow">Continue reading</p>
                  <h2 id="blog-related-title">Related stories</h2>
                  <ul>
                    {relatedItems.map((item) => {
                      const relatedImage = item.featured_image_url || item.image_url;
                      return <li key={item.slug}>
                        <Link className="blog-related-link" href={getCmsContentHref(item.slug, item.category_slug)}>
                          <span className={`blog-related-thumb${relatedImage ? "" : " blog-related-thumb-placeholder"}`}>
                            {relatedImage
                              ? <img src={relatedImage} alt="" loading="lazy" style={{ objectPosition: item.featured_image_position || "50% 50%" }} />
                              : <BookOpen size={20} aria-hidden="true" />}
                          </span>
                          <span className="blog-related-copy"><span className="blog-related-title">{item.title}</span><span className="blog-related-action">View full post</span></span>
                          <ArrowUpRight className="blog-related-arrow" size={17} aria-hidden="true" />
                        </Link>
                      </li>;
                    })}
                  </ul>
                </nav>}

                {selectedKind === "blog" ? <section className="detail-sidebar-card blog-appointment-card" aria-labelledby="blog-appointment-title">
                  <p className="eyebrow">A thoughtful next step</p>
                  <h2 id="blog-appointment-title">Request an appointment</h2>
                  <p className="blog-appointment-intro">Share a few details and our team will get in touch privately.</p>
                  <AppointmentRequestForm />
                </section> : selectedKind === "service" ? <div className="service-category-sidebar-grid">
                  {serviceCategoryRecommendations.map((category) => <nav className="detail-sidebar-card detail-related" key={category.slug} aria-label={`Related ${category.label.toLowerCase()}`}>
                    <p className="eyebrow">Keep exploring</p>
                    <h2>{category.label}</h2>
                    {category.items.length > 0 ? <ul>
                      {category.items.map((item) => <li key={item.slug}>
                        <a href={getCmsContentHref(item.slug, item.category_slug)}>{item.title}<ArrowUpRight size={15} aria-hidden="true" /></a>
                      </li>)}
                    </ul> : <p className="service-category-sidebar-empty">Explore more {category.label.toLowerCase()} services.</p>}
                    <a className="detail-browse-link" href={`/services/?category=${encodeURIComponent(category.slug)}`}>Browse all {category.label.toLowerCase()} <span aria-hidden="true">→</span></a>
                  </nav>)}
                </div> : relatedItems.length > 0 && <nav className="detail-sidebar-card detail-related" aria-label={`Related ${selectedCategory.toLowerCase()}`}>
                  <p className="eyebrow">Keep exploring</p>
                  <h2>Related {selectedCategory.toLowerCase()}</h2>
                  <ul>
                    {relatedItems.map((item) => <li key={item.slug}>
                      <a href={getCmsContentHref(item.slug, item.category_slug)}>{item.title}<ArrowUpRight size={15} aria-hidden="true" /></a>
                    </li>)}
                  </ul>
                  <a className="detail-browse-link" href="/services/">Browse all services <span aria-hidden="true">→</span></a>
                </nav>}
              </aside>
            </div>

          </div>

          {selectedKind === "service" && serviceIndex >= 0 && serviceItems.length > 1 && <ServiceRecommendations
            key={selectedSlug}
            currentSlug={selectedSlug}
            items={serviceItems.filter((item) => item.slug !== selectedSlug)}
          />}

          {selectedKind === "service" && <AppointmentShowcase phone={contactPhone} />}

          {!isExpertsPage && <DetailTestimonialsFaq />}

          <ContactSection
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactWhatsApp={contactWhatsApp}
            contactAddress={contactAddress}
          />
        </> : <div className="site-container px-5"><p role="status" className="py-10 text-center text-brown-muted">{detailMessage}</p></div>}
      </main>
    );
  }

  return (
    <main className={listingKind === "services" ? "content-archive content-archive-services" : "content-archive content-archive-all"}>
      {listingKind === "services" ? <>
        <header className="page-hero-band">
          <div className="page-hero-inner site-container">
            <p className="page-hero-kicker">Services</p>
            <h1 className="page-hero-title">Rooted in <em>wellness</em></h1>
            <p className="page-hero-description">Thoughtful support for recovery, therapy, and mental wellbeing — shaped around you.</p>
            <a className="services-hero-scroll" href="#browse-services" aria-label="Explore our services">↓</a>
          </div>
        </header>

        <nav aria-label="Breadcrumb" className="site-container mt-4 px-5">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brown-muted">
            <li><Link href="/" className="transition-colors hover:text-terracotta">Home</Link></li>
            <li aria-hidden="true" className="text-beige">/</li>
            <li aria-current="page" className="font-semibold text-brown">Services</li>
          </ol>
        </nav>

        <div className="services-divider" aria-hidden="true"><span>+</span></div>

        <section id="browse-services" className="services-gallery site-container" aria-labelledby="services-gallery-title">
          <div className="services-gallery-heading">
            <div>
              <p className="eyebrow">Find your next step</p>
              <h2 id="services-gallery-title">Care for every part of you</h2>
            </div>
            <p>Explore our services and discover support that meets you where you are.</p>
          </div>
          <div className="services-gallery-tools">
            <label className="services-search">
              <span className="sr-only">Search services</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" />
            </label>
            {categories.length > 0 && <div className="services-filter-tabs" role="tablist" aria-label="Filter services">
              <button type="button" role="tab" aria-selected={!category} onClick={() => setCategory("")} className={!category ? "is-active" : ""}>All services</button>
              {categories.map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.slug} onClick={() => setCategory(item.slug)} className={category === item.slug ? "is-active" : ""}>{item.name}</button>)}
            </div>}
          </div>

          {visibleItems.length ? <ul className="services-card-grid" aria-live="polite">
            {visibleItems.map((item) => {
              const image = item.featured_image_url || item.image_url || getServiceImageFallback(item);
              const rawDescription = item.excerpt || item.summary || item.description || "";
              const description = normalizeCmsPlainText(rawDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
              return <li key={item.slug}>
                <Link href={getCmsContentHref(item.slug, item.category_slug)} className="service-tile">
                  {image
                    ? <img src={image} alt="" loading="lazy" style={{ objectPosition: item.featured_image_position || "50% 50%" }} className="service-tile-image" />
                    : <span className="service-tile-placeholder" aria-hidden="true" />}
                  <span className="service-tile-overlay" aria-hidden="true" />
                  <span className="service-tile-plus" aria-hidden="true">+</span>
                  <span className="service-tile-copy">
                    <span className="service-tile-title">{item.title}</span>
                    {description && <span className="service-tile-description">{description}</span>}
                  </span>
                </Link>
              </li>;
            })}
          </ul> : <p role="status" className="services-empty">{allItems.length ? "No services match your search. Try another title or care type." : pagesMessage || "Loading published services..."}</p>}
        </section>

        <AppointmentShowcase phone={contactPhone} />

        <DetailTestimonialsFaq showTestimonials={false} />
      </> : <>
        <header className="archive-heading site-container">
          <p className="eyebrow text-terracotta">Roar Wellness</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-brown md:text-6xl">Treatments &amp; site pages</h1>
          <p className="archive-intro">Published treatment information, therapy, mental healthcare, and pages from Roar Wellness.</p>
        </header>
        <section className="site-container" aria-label="Browse site content">
          <div className="archive-toolbar">
            <label className="archive-search">
              <span>Find content</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles and summaries" />
            </label>
            {categories.length > 0 && <div className="archive-tabs" role="tablist" aria-label="Filter site content">
              <button type="button" role="tab" aria-selected={!category} onClick={() => setCategory("")} className={!category ? "archive-tab is-active" : "archive-tab"}>All</button>
              {categories.map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.slug} onClick={() => setCategory(item.slug)} className={category === item.slug ? "archive-tab is-active" : "archive-tab"}>{item.name}</button>)}
            </div>}
          </div>
          {visibleItems.length ? <ul className="archive-list">
            {visibleItems.map((item, index) => (
              <li key={item.slug} className="archive-item archive-item-has-image">
                <span className="archive-item-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <Link href={getCmsContentHref(item.slug, item.category_slug)} className={`archive-item-image ${item.featured_image_url ? "" : "archive-item-image-placeholder"}`} aria-label={`View ${item.title}`}>
                  {item.featured_image_url
                    ? <img src={item.featured_image_url} alt={item.featured_image_alt || ""} loading="lazy" style={{ objectPosition: item.featured_image_position || "50% 50%" }} />
                    : <span aria-hidden="true">Roar Wellness</span>}
                </Link>
                <div className="archive-item-content">
                  <p className="archive-item-category">{item.category_name}</p>
                  <h2><Link href={getCmsContentHref(item.slug, item.category_slug)}>{item.title}</Link></h2>
                  {(item.excerpt || item.summary) && <p className="archive-item-summary">{normalizeCmsPlainText(item.excerpt || item.summary || "")}</p>}
                </div>
                <Link href={getCmsContentHref(item.slug, item.category_slug)} className="archive-item-action">
                  View details <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul> : <p role="status" className="archive-empty">{allItems.length ? "No content matches your search. Try another title or category." : pagesMessage || "Loading published content..."}</p>}
        </section>
        <p className="mt-10 text-center"><Link href="/#top" className="text-sm font-semibold text-terracotta hover:underline">Back to home</Link></p>
      </>}
    </main>
  );
}