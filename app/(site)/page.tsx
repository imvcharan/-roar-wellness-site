"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { GalleryLightbox } from "@/components/layout/GalleryLightbox";
import { galleryImages } from "@/lib/gallery-images";
import { getCmsContentHref } from "@/lib/cms-routes";
import { cmsRequest } from "@/services/cms-api";
import { defaultFaqs, defaultReviews, FaqSection, TestimonialsSection, type Faq, type Review } from "@/components/site/TestimonialsFaq";
import { ContactSection } from "@/components/site/ContactSection";
import { AppointmentShowcase } from "@/components/site/AppointmentShowcase";

interface CmsService {
  title: string;
  slug: string;
  category_slug: string;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  featured_image_alt: string | null;
  featured_image_position: string;
}

interface CmsBlogPost {
  title: string;
  slug: string;
  category_slug: string;
  excerpt: string | null;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  featured_image_position: string;
}

interface CmsHomeSection {
  section_key: string;
  heading: string;
  eyebrow: string;
  body: string;
  image_url: string;
  position: number;
}

interface CmsFaq {
  question: string;
  answer: string;
}

function servicePlaceholderImage(title: string, slug: string, category: string): string {
  const serviceName = `${title} ${slug}`.toLowerCase();
  if (/alcohol/.test(serviceName)) return "/images/Alcohol%20Addiction.png";
  if (/heroin/.test(serviceName)) return "/images/Heroine%20Addiction.png";
  if (/opioid|morphine|benzodiazepine/.test(serviceName)) return "/images/Opioid%20Addiction.png";
  if (/cocaine/.test(serviceName)) return "/images/Cocaine%20Addiction.png";
  if (/cannabis|marijuana|charas/.test(serviceName)) return "/images/Marijuana%20Addiction.png";
  if (/gambl/.test(serviceName)) return "/images/Gambling%20Addiction.png";
  if (/internet|drug/.test(serviceName)) return "/images/Drug%20Addiction.png";
  if (/sex/.test(serviceName)) return "/images/sex%20Addiction.png";
  if (/schizophren/.test(serviceName)) return "/images/Schizophrenia.png";
  if (/bipolar/.test(serviceName)) return "/images/Bipolar%20Disorder.png";
  if (/adhd/.test(serviceName)) return "/images/ADHD.png";
  if (/nutri/.test(serviceName)) return "/images/nutritional-guidance.png";
  if (/detox|drainage/.test(serviceName)) return "/images/detox-dranage-therapy.png";
  if (/pain|relief/.test(serviceName)) return "/images/pain-relief-therapy.png";
  if (/mind|yoga|meditation/.test(serviceName)) return "/images/mind-body-coaching.png";
  if (/naturopath|consultation|mental|psychiatr/.test(serviceName) || category === "mental-healthcare") {
    return "/images/naturopathic-consultation.png";
  }
  return "/images/atlas-session.png";
}

export default function Home() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeInterludeStep, setActiveInterludeStep] = useState(0);
  const [revealedApproachItems, setRevealedApproachItems] = useState<Set<number>>(() => new Set([0]));
  const [approachRevealReady, setApproachRevealReady] = useState(false);
  const approachStepsRef = useRef<HTMLDivElement>(null);
  const careInterludeRef = useRef<HTMLElement>(null);
  const [facilityIndex, setFacilityIndex] = useState(0);
  const [cmsServices, setCmsServices] = useState<CmsService[]>([]);
  const [cmsServicesLoaded, setCmsServicesLoaded] = useState(false);
  const [cmsBlogPosts, setCmsBlogPosts] = useState<CmsBlogPost[]>([]);
  const [blogMessage, setBlogMessage] = useState("Loading published articles...");
  const [cmsFaqs, setCmsFaqs] = useState<Faq[]>([]);
  const [cmsFaqsLoaded, setCmsFaqsLoaded] = useState(false);
  const [cmsHome, setCmsHome] = useState<Record<string, CmsHomeSection[]>>({});
  const [cmsHomeLoaded, setCmsHomeLoaded] = useState(false);
  const [homeSettings, setHomeSettings] = useState<Record<string, string>>({});
  const contactEmail = homeSettings.contactEmail || "help@roarwellness.org";
  const contactPhone = homeSettings.contactPhone || "+919319977207";
  const contactWhatsApp = homeSettings.contactWhatsApp || "+919773890499";
  const contactAddress = homeSettings.contactAddress
    || "Akhil Farm, 1 Daisy Lane, Off Central Drive, DLF Chattarpur Farms, New Delhi 110074, India";

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: CmsService[] }>("/api/content/services?all=1")
      .then(({ data }) => { if (mounted) { setCmsServices(data); setCmsServicesLoaded(true); } })
      .catch((error: unknown) => console.error("Unable to load published homepage services.", error));
    cmsRequest<{ data: CmsBlogPost[] }>("/api/content/blog")
      .then(({ data }) => {
        if (!mounted) return;
        setCmsBlogPosts(data);
        setBlogMessage(data.length ? "" : "No articles have been published yet.");
      })
      .catch((error: unknown) => {
        console.error("Unable to load published homepage articles.", error);
        if (mounted) setBlogMessage("Articles are temporarily unavailable.");
      });
    cmsRequest<{ data: CmsFaq[] }>("/api/content/faqs")
      .then(({ data }) => { if (mounted) { setCmsFaqs(data.map((faq) => [faq.question, faq.answer] as Faq)); setCmsFaqsLoaded(true); } })
      .catch((error: unknown) => console.error("Unable to load published FAQs.", error));
    cmsRequest<{ data: Record<string, string> }>("/api/content/settings")
      .then(({ data }) => { if (mounted) setHomeSettings(data); })
      .catch((error: unknown) => console.error("Unable to load site settings.", error));
    cmsRequest<{ data: Record<string, CmsHomeSection[]> }>("/api/content/home")
      .then(({ data }) => { if (mounted) { setCmsHome(data); setCmsHomeLoaded(true); } })
      .catch((error: unknown) => console.error("Unable to load homepage content.", error));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);

    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const section = careInterludeRef.current;
    if (!section) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const step = Number((entry.target as HTMLElement).dataset.careInterludeStep);
        if (Number.isInteger(step)) setActiveInterludeStep(step);
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    section.querySelectorAll("[data-care-interlude-step]").forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  const featuredServiceSlugs = [
    "alcohol-addiction",
    "opioid-treatment",
    "heroin-addiction",
    "cocaine-addiction",
    "cannabis-treatment",
    "poly-substance-abuse",
  ];
  const fallbackServices = [
    "Alcohol Addiction",
    "Opioid Treatment",
    "Heroin Addiction",
    "Cocaine Addiction",
    "Cannabis Treatment",
    "Poly Substance Abuse",
  ];
  const serviceDescriptions: Record<string, string> = {
    "alcohol-addiction": "Personalized clinical and therapeutic support for recovery from alcohol dependence.",
    "opioid-treatment": "Structured care and ongoing support for people recovering from opioid use.",
    "heroin-addiction": "Individualized rehabilitation and support for recovery from heroin dependence.",
    "cocaine-addiction": "Therapeutic care tailored to each person's recovery from cocaine use.",
    "cannabis-treatment": "Personalized support to address cannabis use and build sustainable recovery.",
    "poly-substance-abuse": "Integrated care for people affected by the use of multiple substances.",
  };
  const treatmentImages: Record<string, string> = {
    "Alcohol Addiction": "/images/Alcohol%20Addiction.png",
    "Opioid Addiction": "/images/Opioid%20Addiction.png",
    "Heroin Addiction": "/images/Heroine%20Addiction.png",
    "Cocaine Addiction": "/images/Cocaine%20Addiction.png",
    "Poly Substance Abuse": "/images/Poly%20Substance%20Abuse.png",
    "Benzodiazepine Addiction": "/images/Benzodiazepine%20Addiction.png",
    "Morphine Addiction": "/images/Morphine%20Addiction.png",
    "Gambling Addiction": "/images/Gambling%20Addiction.png",
    "Internet Addiction": "/images/Drug%20Addiction.png",
    "Sex Addiction": "/images/sex%20Addiction.png",
    Schizophrenia: "/images/Schizophrenia.png",
    "Bipolar Disorder": "/images/Bipolar%20Disorder.png",
    ADHD: "/images/ADHD.png",
    "Drugs addiction": "/images/Drug%20Addiction.png",
    "Marijuana addiction": "/images/Marijuana%20Addiction.png",
  };

  const activeReviews = cmsHomeLoaded
    ? (cmsHome.reviews || []).map((item) => [item.heading, item.body, item.image_url] as Review)
    : defaultReviews;

  const activeFaqs: Faq[] = cmsFaqsLoaded ? cmsFaqs : defaultFaqs;
  const [galleryIndex, setGalleryIndex] = useState(0);

  const facilitySlides = [
    ["Table Tennis", "A fun table setup for fast-paced ping pong matches that boost focus and energy.", "/images/facility-table-tennis.webp"],
    ["Swimming Pool", "A clean pool for relaxation, rehab, and healthy aquatic exercise routines.", "/images/facility-swimming-pool.webp"],
    ["Gym", "Modern gym equipment to support strength, stamina, and self-confidence.", "/images/facility-gym.webp"],
    ["Medical Room", "Fully facilitated medical room for good mental peace and personal growth.", "/images/facility-therapy-room.webp"],
    ["Yoga Meditation", "Peaceful yoga hall to regain balance, flexibility, and inner calm.", "/images/facility-yoga-meditation.webp"],
    ["Library", "Best library for reading and discussion for individual growth.", "/images/facility-library.webp"],
    ["Open Space", "Relax or walk in fresh air, reconnect with nature in our lush open ground.", "/images/facility-open-space.webp"],
    ["Snooker Table", "Play your game! Professional snooker table for mind-sharpening fun.", "/images/facility-snooker-table.webp"],
  ];
  const activeFacilitySlides = cmsHomeLoaded
    ? (cmsHome.facility || []).map((item) => [item.heading, item.body, item.image_url] as [string, string, string])
    : facilitySlides;
  const loopingFacilitySlides = [...activeFacilitySlides, ...activeFacilitySlides];

  useEffect(() => {
    if (activeFacilitySlides.length === 0) return;
    const timer = window.setInterval(() => {
      setFacilityIndex((current) => (current + 1) % activeFacilitySlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [cmsHome.facility?.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGalleryIndex((current) => (current + 1) % galleryImages.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [galleryImages.length]);

  const renderGalleryImages = (offset: number) => (
    <div className="mosaic-gallery" aria-label="Roar Wellness gallery slideshow">
      {galleryImages.map((image, index) => <img key={image} src={image} alt="Roar Wellness facility" data-gallery-index={index} className={`mosaic-gallery-image ${index === (galleryIndex + offset) % galleryImages.length ? "is-active" : ""}`} />)}
    </div>
  );

  const activeServices = cmsServicesLoaded
    ? featuredServiceSlugs.flatMap((slug) => {
      const item = cmsServices.find((service) => service.slug === slug);
      return item ? [{
        title: item.title,
        slug: item.slug,
        categorySlug: item.category_slug,
        description: item.summary?.trim() || item.description?.trim() || serviceDescriptions[item.slug] || "",
        imageUrl: item.image_url || treatmentImages[item.title] || servicePlaceholderImage(item.title, item.slug, item.category_slug),
        imagePosition: item.featured_image_position || "50% 50%",
      }] : [];
    })
    : fallbackServices.map((title, index) => ({
      title,
      slug: featuredServiceSlugs[index],
      categorySlug: "treatments",
      description: serviceDescriptions[featuredServiceSlugs[index]],
      imageUrl: treatmentImages[title] || servicePlaceholderImage(title, featuredServiceSlugs[index], "treatments"),
      imagePosition: "50% 50%",
    }));
  const homeBlogPosts = cmsBlogPosts.slice(0, 3);
  const featuredRecoveryPost = cmsBlogPosts.find(
    (post) => post.slug === "borderline-personality-disorder-diagnosis-substance-addiction-and-recovery",
  );
  if (featuredRecoveryPost && !homeBlogPosts.some((post) => post.slug === featuredRecoveryPost.slug)) {
    if (homeBlogPosts.length === 3) homeBlogPosts[2] = featuredRecoveryPost;
    else homeBlogPosts.push(featuredRecoveryPost);
  }
  const activeBlogPosts = homeBlogPosts.map((post) => ({
    ...post,
    description: post.excerpt?.trim() || post.summary?.trim() || post.description?.trim() || "",
    imageUrl: post.image_url || servicePlaceholderImage(post.title, post.slug, post.category_slug),
    imagePosition: post.featured_image_position || "50% 50%",
  }));

  const approachItems = [
    {
      title: "Evidence based therapy",
      description: "Emotional Brain Training helps individuals rewire stress responses, develop emotional regulation, and shift from negative patterns to healthier thinking and behavior patterns.",
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
    {
      title: "Dynamic Detox",
      description: "This method uses natural techniques like hydration, diet, and movement to remove toxins, cleanse the system, and renew physical and mental clarity safely and holistically.",
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
    {
      title: "Yoga",
      description: "Yoga enhances mind-body awareness, reduces anxiety, and improves physical strength and flexibility through poses, breathwork, and meditation, fostering complete well-being.",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
    {
      title: "Game Therapy",
      description: "Game Therapy uses structured play to promote communication, boost self-esteem, manage behaviors, and encourage recovery in an engaging and enjoyable format.",
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
    {
      title: "Art Therapy",
      description: "Art Therapy provides a non-verbal outlet for expressing emotions and trauma, aiding in emotional release, self-discovery, and the healing process through creative means.",
      image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
    {
      title: "Water Sports",
      description: "Water activities such as swimming and kayaking help build confidence, improve fitness, and provide therapeutic relaxation that supports emotional and physical recovery.",
      image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
    {
      title: "Psychology",
      description: "Psychological counseling helps individuals understand emotions, change negative thinking patterns, and heal past trauma through therapeutic dialogues and behavior strategies.",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1200&q=80",
      position: "center center",
    },
  ];
  const activeApproachItems = cmsHomeLoaded
    ? (cmsHome.approach || []).map((item) => ({ title: item.heading, description: item.body, image: item.image_url, position: "center center" }))
    : approachItems;

  useEffect(() => {
    const stepElements = approachStepsRef.current?.querySelectorAll<HTMLElement>(".approach-step");
    if (!stepElements?.length) return;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      setRevealedApproachItems(new Set(Array.from(stepElements, (_, index) => index)));
      setApproachRevealReady(true);
      return;
    }

    setRevealedApproachItems(new Set([0]));
    setApproachRevealReady(true);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = Number((entry.target as HTMLElement).dataset.approachIndex);
        setRevealedApproachItems((current) => {
          if (current.has(index)) return current;
          const next = new Set(current);
          next.add(index);
          return next;
        });
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    stepElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [cmsHomeLoaded, reducedMotion]);
  return (
    <main id="top" className="home-theme">
      <section className="home-hero relative flex min-h-[92vh] items-center justify-center bg-brand-plum px-6 py-32 text-cream md:px-12 md:py-36">
        <iframe
          title="Roar Wellness hero background"
          src="https://www.youtube.com/embed/zmzAImnceg8?autoplay=1&mute=1&controls=0&loop=1&playlist=zmzAImnceg8&playsinline=1&rel=0"
          allow="autoplay; encrypted-media"
          className="hero-video"
          aria-hidden="true"
        />
        <div className="home-hero-content relative site-container">
          <p className="eyebrow mb-6 text-cream/75">{homeSettings.homepageHeroEyebrow || "Rehabilitation centre · Delhi"}</p>
          <h1 className="mx-auto max-w-5xl font-serif text-[clamp(3.8rem,10vw,9.5rem)] leading-[.86] tracking-[-.06em]">{homeSettings.homepageHeroTitle || "Roar Wellness"}</h1>
          <p className="mx-auto mt-8 max-w-xl text-xl italic leading-relaxed text-cream/85 md:text-2xl" style={{ fontFamily: "var(--font-body)" }}>{homeSettings.homepageHeroDescription || "A premier rehabilitation centre committed to transforming lives through personalized, evidence-based care."}</p>
          <a href="tel:+919319977207" className="home-hero-appointment">
            <span>Make an appointment</span><span className="home-hero-appointment-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section id="about" className="approach-section px-6 py-24 md:px-12 md:py-32">
        <div className="approach-layout site-container">
          <div className="approach-lead">
            <p className="approach-kicker">{homeSettings.homepageApproachEyebrow || "Approach"}</p>
            <h2 className="approach-heading">{homeSettings.homepageApproachTitle || "Our Approach"}</h2>
            <p className="approach-intro">{homeSettings.homepageApproachDescription || "At Roar Wellness Rehab Centre, we believe that healing and transformation happen through experiences. Our Evidence Based Therapy is a unique and dynamic approach designed to support individuals struggling with addiction, mental health issues, and emotional distress. This therapy harnesses the power of real-life events and structured activities to promote personal growth, self-awareness, and long-term recovery."}</p>
            <Link href="/services" className="approach-action">Explore Services <span aria-hidden="true">→</span></Link>
          </div>

          <div
            ref={approachStepsRef}
            className="approach-steps"
            role="list"
            aria-label="Our approach"
            data-reveal-ready={approachRevealReady || undefined}
          >
            {activeApproachItems.map(({ title, description }, index) => (
              <article
                key={`${title}-${index}`}
                className={`approach-item approach-step${revealedApproachItems.has(index) ? " is-visible" : ""}`}
                data-approach-index={index}
                role="listitem"
                style={{ transitionDelay: `${Math.min(index * 90, 540)}ms` }}
              >
                <span className="approach-number">{index + 1}</span>
                <div className="approach-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-showcase" aria-labelledby="about-showcase-title">
        <div className="about-showcase-card">
          <p className="eyebrow">About Roar Wellness</p>
          <h2 id="about-showcase-title">A place to begin again</h2>
          <p>
            We offer compassionate, evidence-based rehabilitation and mental health care,
            supporting individuals and families through every step of recovery.
          </p>
          <Link href="/about-roarwellness/" className="about-showcase-link">
            Get to know us <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section id="services" className="services-section px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="services-heading-row">
            <div>
              <p className="eyebrow text-coral">Services</p>
              <h2 className="section-title mt-5 text-olive">Our signature <em>services</em></h2>
            </div>
            <Link href="/services/" className="services-browse-link">
              <span>Explore all Services</span><span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="services-grid" role="list" aria-label="Roar Wellness services">
            {activeServices.map((service, index) => {
              const href = service.slug ? getCmsContentHref(service.slug, service.categorySlug) : "/services/";
              return (
                <Link
                  key={`${service.slug || service.title}-${index}`}
                  href={href}
                  className="service-tile"
                  aria-label={`Explore ${service.title}`}
                  role="listitem"
                >
                  {service.imageUrl
                    ? <img src={service.imageUrl} alt="" loading="lazy" style={{ objectPosition: service.imagePosition }} className="service-tile-image" />
                    : <span className="service-tile-placeholder" aria-hidden="true" />}
                  <span className="service-tile-overlay" aria-hidden="true" />
                  <span className="service-tile-plus" aria-hidden="true">+</span>
                  <span className="service-tile-copy">
                    <span className="service-tile-title">{service.title}</span>
                    <span className="service-tile-description">{service.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={careInterludeRef} className="care-interlude" aria-label="Care centered around you">
        <div className="care-interlude-scene" data-step={activeInterludeStep}>
          <img src="/images/naturopathic-consultation.png" alt="A care provider speaking with a patient" className="care-interlude-image" />
          <span className="care-interlude-shade" aria-hidden="true" />
          <span className="care-interlude-frame" aria-hidden="true" />
          <h2 className="care-interlude-copy" aria-live="polite" aria-atomic="true">
            <span key={`left-${activeInterludeStep}`} className="care-interlude-copy-side care-interlude-copy-left">
              {activeInterludeStep === 0 ? "Care" : "Recovery"}
            </span>
            <span key={`right-${activeInterludeStep}`} className="care-interlude-copy-side care-interlude-copy-right">
              {activeInterludeStep === 0 ? <>that sees<br />you</> : <>at your<br />pace</>}
            </span>
          </h2>
        </div>
        <span className="care-interlude-step" data-care-interlude-step="0" aria-hidden="true" />
        <span className="care-interlude-step care-interlude-step-later" data-care-interlude-step="1" aria-hidden="true" />
      </section>

      <section id="essence" className="essence-section py-20 md:py-28" aria-labelledby="essence-heading">
        <div className="site-container">
          <div className="essence-heading">
            <p className="eyebrow">Essence</p>
            <h2 id="essence-heading">Care that <em>connects</em></h2>
          </div>
          <GalleryLightbox images={galleryImages}>
            <div className="essence-mosaic">
              <article className="mosaic-card mosaic-rooted" tabIndex={0}>
                {renderGalleryImages(0)}
                <span className="mosaic-shade" aria-hidden="true" />
                <span className="mosaic-plus" aria-hidden="true">+</span>
                <span className="mosaic-card-copy">
                  <span className="mosaic-card-title">Rooted in recovery</span>
                  <span className="mosaic-card-description">A calm, supportive place to take your next step.</span>
                </span>
              </article>

              <article className="mosaic-card mosaic-personal" tabIndex={0}>
                <img src="/images/nutritional-guidance.png" alt="" className="mosaic-personal-image" />
                <span className="mosaic-plus" aria-hidden="true">+</span>
                <span className="mosaic-card-copy">
                  <span className="mosaic-card-title">Truly personal</span>
                  <span className="mosaic-card-description">Care shaped around the person, not just the diagnosis.</span>
                </span>
              </article>

              <article className="mosaic-card mosaic-feature" tabIndex={0}>
                <img src="/images/atlas-session.png" alt="" className="mosaic-feature-image" />
                <span className="mosaic-shade" aria-hidden="true" />
                <span className="mosaic-plus" aria-hidden="true">+</span>
                <span className="mosaic-card-copy">
                  <span className="mosaic-card-title">Personalized care at Roar Wellness</span>
                  <span className="mosaic-card-description">Professional guidance and compassionate support through recovery.</span>
                </span>
              </article>

              <article className="mosaic-card mosaic-quote" tabIndex={0}>
                <span className="mosaic-plus" aria-hidden="true">+</span>
                <span className="mosaic-quote-mark" aria-hidden="true">“</span>
                <div className="mosaic-quote-slider" aria-live="polite">
                  {(activeReviews.length ? activeReviews : defaultReviews).slice(0, 3).map(([name, quote], index) => (
                    <span key={`${name}-${index}`} className="mosaic-quote-item" style={{ animationDelay: `${index * 4}s` }}>
                      <span>{quote}</span><span className="mosaic-quote-author">— {name}</span>
                    </span>
                  ))}
                </div>
              </article>

              <article className="mosaic-card mosaic-timeline" tabIndex={0}>
                <img src="/images/recovery-at-your-pace.webp" alt="" className="mosaic-timeline-image" />
                <span className="mosaic-plus" aria-hidden="true">+</span>
                <span className="mosaic-card-copy">
                  <span className="mosaic-card-title">Your path, at your pace</span>
                  <span className="mosaic-card-description">A supportive team helps you explore the next steps that fit your needs.</span>
                </span>
                <span className="mosaic-orbit" aria-hidden="true">
                  {[1, 4, 7, 10, 13].map((offset, index) => (
                    <span
                      key={offset}
                      className={`mosaic-orbit-dot mosaic-orbit-dot-${index + 1}`}
                      style={{ backgroundImage: `url("${galleryImages[offset]}")` }}
                    />
                  ))}
                </span>
              </article>

              <a className="mosaic-card mosaic-stat" href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>
                <span className="mosaic-plus" aria-hidden="true">+</span>
                <span className="mosaic-avatar-stack" aria-hidden="true">
                  {(activeReviews.length ? activeReviews : defaultReviews).slice(0, 3).map(([name, , avatar]) => (
                    <img key={name} src={avatar} alt="" />
                  ))}
                </span>
                <span className="mosaic-card-copy">
                  <span className="mosaic-card-title">Here when you&apos;re ready</span>
                  <span className="mosaic-card-description">Start with a confidential conversation. Call our care team.</span>
                </span>
                <span className="mosaic-stat-link">Make an appointment <span aria-hidden="true">→</span></span>
              </a>
            </div>
          </GalleryLightbox>
          <div className="gallery-action"><a href="/gallery" className="gallery-view-more">View more <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>

      <section id="facility" className="facility-section bg-sand px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="facility-heading-row mb-12">
            <div>
              <p className="eyebrow text-coral">Roar Wellness Rehabilitation Centre</p>
              <h2 className="section-title mt-5 text-olive">Our <em>Facility</em></h2>
            </div>
          </div>

          <div className="facility-carousel" aria-roledescription="carousel" aria-label="Roar Wellness facility gallery">
            <GalleryLightbox
              images={activeFacilitySlides.map(([, , image]) => image)}
              imageAlts={activeFacilitySlides.map(([title, description]) => `${title}: ${description}`)}
            >
              <div className="facility-viewport">
                <div
                  className="facility-track"
                  style={{
                    "--facility-card-basis": `${100 / loopingFacilitySlides.length}%`,
                    "--facility-track-desktop-width": `${loopingFacilitySlides.length / 3 * 100}%`,
                    "--facility-track-tablet-width": `${loopingFacilitySlides.length / 2 * 100}%`,
                    "--facility-track-mobile-width": `${loopingFacilitySlides.length * 100}%`,
                    transform: `translateX(-${facilityIndex * (100 / loopingFacilitySlides.length)}%)`,
                  } as CSSProperties}
                >
                  {loopingFacilitySlides.map(([title, description, image], index) => (
                    <article key={`${title}-${index}`} className="facility-slide" aria-hidden={index >= activeFacilitySlides.length} aria-label={`${(index % activeFacilitySlides.length) + 1} of ${activeFacilitySlides.length}`}>
                      <div className="facility-image-wrap">
                        <button type="button" className="facility-image-button" data-gallery-index={index % activeFacilitySlides.length} aria-label={`View full image: ${title}`} tabIndex={index >= activeFacilitySlides.length ? -1 : 0}>
                          <img src={image} alt={`${title}: ${description}`} className="facility-image" />
                        </button>
                      </div>
                      <div className="facility-card-copy">
                        <p className="facility-index">{String((index % activeFacilitySlides.length) + 1).padStart(2, "0")}</p>
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </GalleryLightbox>
            <div className="facility-controls">
              <div className="facility-dots" role="tablist" aria-label="Choose a facility slide">
                {activeFacilitySlides.map(([title], index) => (
                  <button key={title} type="button" role="tab" aria-label={`Show ${title}`} aria-selected={facilityIndex === index} className={facilityIndex === index ? "facility-dot is-active" : "facility-dot"} onClick={() => setFacilityIndex(index)} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Previous facility" className="treatment-arrow" disabled={!activeFacilitySlides.length} onClick={() => setFacilityIndex((current) => (current - 1 + activeFacilitySlides.length) % activeFacilitySlides.length)}>←</button>
                <button type="button" aria-label="Next facility" className="treatment-arrow" disabled={!activeFacilitySlides.length} onClick={() => setFacilityIndex((current) => (current + 1) % activeFacilitySlides.length)}>→</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="blog" className="blog-section services-section px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="services-heading-row">
            <div>
              <p className="eyebrow text-coral">Blogs</p>
              <h2 className="section-title mt-5 text-olive">Stories for the <em>journey</em></h2>
            </div>
            <Link href="/blog/" className="services-browse-link">
              <span>Explore all Blogs</span><span aria-hidden="true">→</span>
            </Link>
          </div>
          {activeBlogPosts.length
            ? <div className="blog-showcase" role="list" aria-label="Latest Roar Wellness articles">
              {activeBlogPosts.map((post, index) => (
                <Link
                  key={post.slug}
                  href={getCmsContentHref(post.slug, post.category_slug)}
                  className={`blog-showcase-card${index === 0 ? " blog-showcase-featured" : " blog-showcase-secondary"}`}
                  aria-label={`Read ${post.title}`}
                  role="listitem"
                >
                  <span className="blog-showcase-image">
                    <img src={post.imageUrl} alt="" loading="lazy" style={{ objectPosition: post.imagePosition }} />
                    <span className="blog-showcase-category">{post.category_slug.replace(/-/g, " ")}</span>
                  </span>
                  <span className="blog-showcase-copy">
                    <span className="blog-showcase-title">{post.title}</span>
                    {post.description && <span className="blog-showcase-description">{post.description}</span>}
                    <span className="blog-showcase-arrow" aria-hidden="true">↗</span>
                  </span>
                </Link>
              ))}
            </div>
            : <p className="blog-section-message" role="status">{blogMessage}</p>}
        </div>
      </section>

      <AppointmentShowcase phone={contactPhone} />

      <TestimonialsSection reviews={activeReviews} variant="featured" />
      <FaqSection faqs={activeFaqs} />

      <ContactSection
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactWhatsApp={contactWhatsApp}
        contactAddress={contactAddress}
      />

    </main>
  );
}
