"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { GalleryLightbox } from "@/components/layout/GalleryLightbox";
import { galleryImages } from "@/lib/gallery-images";
import { getCmsContentHref } from "@/lib/cms-routes";
import { cmsRequest } from "@/services/cms-api";
import { defaultFaqs, defaultReviews, FaqSection, TestimonialsSection, type Faq, type Review } from "@/components/site/TestimonialsFaq";
import { ContactSection } from "@/components/site/ContactSection";

interface CmsTreatment {
  title: string;
  slug: string;
  category_slug: string;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  featured_image_alt: string | null;
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

export default function Home() {
  const [treatmentIndex, setTreatmentIndex] = useState(0);
  const [treatmentAutoplayPaused, setTreatmentAutoplayPaused] = useState(false);
  const [treatmentReducedMotion, setTreatmentReducedMotion] = useState(false);
  const [approachIndex, setApproachIndex] = useState(0);
  const [approachAutoplayPaused, setApproachAutoplayPaused] = useState(false);
  const [facilityIndex, setFacilityIndex] = useState(0);
  const [cmsTreatments, setCmsTreatments] = useState<CmsTreatment[]>([]);
  const [cmsTreatmentsLoaded, setCmsTreatmentsLoaded] = useState(false);
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
    cmsRequest<{ data: CmsTreatment[] }>("/api/content/services")
      .then(({ data }) => { if (mounted) { setCmsTreatments(data); setCmsTreatmentsLoaded(true); } })
      .catch((error: unknown) => console.error("Unable to load published treatment cards.", error));
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

  const treatments = [
    ["Alcohol Addiction", "A chronic disorder involving uncontrollable alcohol use, leading to physical, emotional, and social problems; treatable with therapy and support."],
    ["Opioid Addiction", "Dependence on prescription or illegal opioids, causing brain changes, intense cravings, and health issues; requires medical and psychological treatment."],
    ["Heroin Addiction", "A powerful opioid causing intense euphoria, tolerance, and dependence, leading to severe health, social, and legal consequences without treatment."],
    ["Cocaine Addiction", "A stimulant drug that causes intense energy and mood changes, leading to psychological dependence, paranoia, and cardiovascular risks."],
    ["Poly Substance Abuse", "Use of multiple drugs simultaneously, increasing risks and complicating treatment due to interactions and severe psychological and physical harm."],
    ["Benzodiazepine Addiction", "Dependence on anxiety medications, leading to tolerance, withdrawal symptoms, cognitive issues, and emotional instability without medical supervision."],
    ["Morphine Addiction", "Strong painkiller dependency affecting brain function, causing euphoria, tolerance, and withdrawal symptoms; needs supervised medical treatment."],
    ["Gambling Addiction", "Compulsive gambling behavior disrupting finances, relationships, and mental health; cognitive-behavioral therapy helps regain control and stability."],
    ["Internet Addiction", "Excessive internet use disrupting daily life, relationships, and mental health; often treated with behavioral therapy and digital detox strategies."],
    ["Sex Addiction", "Compulsive sexual thoughts and behaviors that interfere with functioning, relationships, and emotional well-being; therapy is essential."],
    ["Schizophrenia", "A serious mental disorder involving hallucinations, delusions, and disorganized thinking; long-term treatment and support are necessary."],
    ["Bipolar Disorder", "A mental health condition marked by extreme mood swings, including emotional highs (mania or hypomania) and lows (depression)."],
    ["ADHD", "A neurodevelopmental disorder causing inattention, hyperactivity, and impulsiveness, affecting focus, behavior, and daily functioning."],
    ["Drugs addiction", "A chronic disease causing compulsive drug seeking, harming health, relationships, and daily life despite negative consequences."],
    ["Marijuana addiction", "Treatment includes behavioral therapies, counseling, cognitive-behavioral therapy (CBT), motivational enhancement therapy (MET), support groups, and sometimes medications for withdrawal symptoms."],
  ];
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

  const team = [
    ["Mr. Madhav Singh", "Founder of Roar Wellness", "Founder of ROAR, involved full time with therapeutic and facility management. He has worked for over 14 years to help people recover and live alcohol- and drug-free lives.", "https://www.roarwellness.org/wp-content/uploads/2025/05/111383828753madhav-1.jpg"],
    ["Dr. Manish Sarkar", "Director of Roar Wellness", "A renowned psychiatrist of Delhi NCR with over two decades of experience in psychiatric disorders and substance dependence, with postgraduate training from NIMHANS, Bangalore.", "https://www.roarwellness.org/wp-content/uploads/2025/05/736893036507dr-manish-sarkar-1.jpg"],
    ["Dhruv Singh Tanwar", "Director of Roar Wellness", "A young, energetic director and social activist who volunteers with youth and social development programs and shares the knowledge gained from his journey.", "https://www.roarwellness.org/wp-content/uploads/2025/05/880816739116Dhruv-Singh-Tanwa-1.jpg"],
  ];
  const activeTeam = cmsHomeLoaded
    ? (cmsHome.team || []).map((item) => [item.heading, item.eyebrow, item.body, item.image_url] as [string, string, string, string])
    : team;
  const activeReviews = cmsHomeLoaded
    ? (cmsHome.reviews || []).map((item) => [item.heading, item.body, item.image_url] as Review)
    : defaultReviews;

  const activeFaqs: Faq[] = cmsFaqsLoaded ? cmsFaqs : defaultFaqs;
  const [galleryIndex, setGalleryIndex] = useState(0);

  const facilitySlides = [
    ["Swimming Pool", "A clean pool for relaxation, rehab, and healthy aquatic exercise routines.", "https://www.roarwellness.org/wp-content/uploads/2025/04/452908267532SS_05330.jpg"],
    ["Gym", "Modern gym equipment to support strength, stamina, and self-confidence.", "https://www.roarwellness.org/wp-content/uploads/2025/04/617565207766SS_05321-1.jpg"],
    ["Open Space", "Relax or walk in fresh air, reconnect with nature in our lush open ground.", "https://www.roarwellness.org/wp-content/uploads/2025/04/544658068149SS_05316.jpg"],
    ["Yoga & Meditation", "Quiet, restorative spaces that support mindfulness and emotional balance.", "https://www.roarwellness.org/wp-content/uploads/2025/04/157245510430SS_05239-1.jpg"],
    ["Game Therapy", "Structured play and shared activities that make recovery engaging and social.", "https://www.roarwellness.org/wp-content/uploads/2025/04/846283606208SS_05300-1.jpg"],
    ["Therapy Room", "Comfortable spaces for evidence-based conversations and personal care.", "https://www.roarwellness.org/wp-content/uploads/2025/04/285728832438SS_05308.jpg"],
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

  const activeTreatments = cmsTreatmentsLoaded
    ? cmsTreatments.map((item) => ({
      title: item.title,
      description: item.summary || item.description || "",
      slug: item.slug,
      categorySlug: item.category_slug,
      imageUrl: item.image_url || treatmentImages[item.title] || null,
      imageAlt: item.featured_image_alt || "",
      imagePosition: item.featured_image_position || "50% 50%",
    }))
    : (treatments as [string, string][]).map(([title, description]) => ({
      title,
      description,
      slug: null,
      categorySlug: "treatments",
      imageUrl: treatmentImages[title] || null,
      imageAlt: "",
      imagePosition: "50% 50%",
    }));
  const treatmentVisibleCount = Math.min(3, activeTreatments.length);
  const treatmentSlides = Array.from({ length: treatmentVisibleCount }, (_, offset) => activeTreatments[(treatmentIndex + offset) % activeTreatments.length]);

  const prevTreatment = () => setTreatmentIndex((current) => (current - 1 + activeTreatments.length) % activeTreatments.length);
  const nextTreatment = () => setTreatmentIndex((current) => (current + 1) % activeTreatments.length);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setTreatmentReducedMotion(preference.matches);

    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (treatmentAutoplayPaused || treatmentReducedMotion || activeTreatments.length <= treatmentVisibleCount) return;

    const timer = window.setInterval(() => {
      setTreatmentIndex((current) => (current + 1) % activeTreatments.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeTreatments.length, treatmentAutoplayPaused, treatmentReducedMotion, treatmentVisibleCount]);

  const modalities = [
    ["Yoga & Meditation", "https://www.roarwellness.org/wp-content/uploads/2025/04/157245510430SS_05239-1.jpg"],
    ["Game Therapy", "https://www.roarwellness.org/wp-content/uploads/2025/04/846283606208SS_05300-1.jpg"],
    ["Evidence-Based Therapy", "https://www.roarwellness.org/wp-content/uploads/2025/04/285728832438SS_05308.jpg"],
  ];

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
    setApproachIndex((current) => activeApproachItems.length ? current % activeApproachItems.length : 0);
  }, [activeApproachItems.length]);

  useEffect(() => {
    if (treatmentReducedMotion || approachAutoplayPaused || activeApproachItems.length <= 1) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setApproachIndex((current) => (current + 1) % activeApproachItems.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeApproachItems.length, approachAutoplayPaused, treatmentReducedMotion]);

  return (
    <main id="top" className="overflow-hidden">
      <section className="relative flex min-h-[92vh] items-end bg-brown px-6 pb-12 pt-40 text-cream md:px-12 md:pb-16">
        <iframe
          title="Roar Wellness hero background"
          src="https://www.youtube.com/embed/zmzAImnceg8?autoplay=1&mute=1&controls=0&loop=1&playlist=zmzAImnceg8&playsinline=1&rel=0"
          allow="autoplay; encrypted-media"
          className="hero-video"
          aria-hidden="true"
        />
        <div className="relative site-container grid gap-10 md:grid-cols-[1fr_280px] md:items-end">
          <div>
            <p className="eyebrow mb-6 text-cream/75">{homeSettings.homepageHeroEyebrow || "Rehabilitation centre · Delhi"}</p>
            <h1 className="max-w-5xl font-serif text-[clamp(3.8rem,10vw,9.5rem)] leading-[.86] tracking-[-.06em]">{homeSettings.homepageHeroTitle || "Roar Wellness"}</h1>
            <p className="mt-8 max-w-xl font-serif text-xl italic leading-relaxed text-cream/85 md:text-2xl">{homeSettings.homepageHeroDescription || "A premier rehabilitation centre committed to transforming lives through personalized, evidence-based care."}</p>
          </div>
          <a href="tel:+919319977207" className="arrow-link mb-2 w-fit text-cream">Call us now <span>↗</span></a>
        </div>
      </section>

      <section id="about" className="approach-section px-6 py-24 md:px-12 md:py-32">
        <div className="approach-layout site-container">
          <div className="approach-lead">
            <p className="approach-kicker">{homeSettings.homepageApproachEyebrow || "Approach"}</p>
            <h2 className="approach-heading">{homeSettings.homepageApproachTitle || "Our Approach"}</h2>
            <p className="approach-intro">{homeSettings.homepageApproachDescription || "At Roar Wellness Rehab Centre, we believe that healing and transformation happen through experiences. Our Evidence Based Therapy is a unique and dynamic approach designed to support individuals struggling with addiction, mental health issues, and emotional distress. This therapy harnesses the power of real-life events and structured activities to promote personal growth, self-awareness, and long-term recovery."}</p>
            <a href="tel:+919319977207" className="approach-action">Call Us Now <span>→</span></a>
          </div>

          <div
            className="approach-steps"
            role="region"
            aria-label="Our approach"
            aria-live="off"
            onMouseEnter={() => setApproachAutoplayPaused(true)}
            onMouseLeave={() => setApproachAutoplayPaused(false)}
          >
            <div
              className="approach-track"
              style={{ transform: `translateX(-${approachIndex * 100}%)` }}
            >
              {activeApproachItems.map(({ title, description, image, position }, index) => (
                <article key={`${title}-${index}`} className="approach-item" style={{ backgroundImage: `url(${image})`, backgroundPosition: position }}>
                  <div className="approach-item-overlay" />
                  <span className="approach-number">{index + 1}</span>
                  <div className="approach-copy">
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
            {activeApproachItems.length > 1 && (
              <div className="approach-carousel-controls" role="group" aria-label="Approach slides">
                <span aria-live="polite">{approachIndex + 1} / {activeApproachItems.length}</span>
                <button type="button" aria-label="Previous approach card" onClick={() => setApproachIndex((current) => (current - 1 + activeApproachItems.length) % activeApproachItems.length)}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Next approach card" onClick={() => setApproachIndex((current) => (current + 1) % activeApproachItems.length)}>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="services" className="bg-sand px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-coral">Our treatments</p>
              <h2 className="section-title mt-5 text-olive">A path toward <em>recovery</em></h2>
              <Link href="/services" className="treatment-browse-link mt-5">
                <span>Browse all services</span><span className="treatment-browse-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTreatmentAutoplayPaused((paused) => !paused)}
                aria-label={treatmentReducedMotion ? "Automatic treatment slides are disabled because reduced motion is enabled" : treatmentAutoplayPaused ? "Resume automatic treatment slides" : "Pause automatic treatment slides"}
                aria-pressed={treatmentAutoplayPaused || treatmentReducedMotion}
                disabled={treatmentReducedMotion}
                className="treatment-arrow"
              >
                {treatmentAutoplayPaused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
              </button>
              <button type="button" onClick={prevTreatment} aria-label="Previous treatment" className="treatment-arrow" disabled={!activeTreatments.length}>←</button>
              <button type="button" onClick={nextTreatment} aria-label="Next treatment" className="treatment-arrow" disabled={!activeTreatments.length}>→</button>
            </div>
          </div>

          <div className="treatment-slider-viewport overflow-hidden" role="region" aria-label="Featured treatments" aria-roledescription="carousel">
            <div className="treatment-slider">
              {treatmentSlides.map((treatment, index) => {
                const href = treatment.slug ? getCmsContentHref(treatment.slug, treatment.categorySlug) : null;
                return (
                  <article key={`${treatment.slug || treatment.title}-${index}`} className="treatment-slide treatment-card">
                    {href ? (
                      <Link href={href} className="treatment-card-media" aria-label={`View ${treatment.title}`}>
                        {treatment.imageUrl
                          ? <img src={treatment.imageUrl} alt={treatment.imageAlt || treatment.title} loading="lazy" style={{ objectPosition: treatment.imagePosition }} />
                          : <span className="treatment-card-image-placeholder" aria-hidden="true">Roar Wellness</span>}
                      </Link>
                    ) : (
                      <div className="treatment-card-media" aria-hidden="true">
                        {treatment.imageUrl
                          ? <img src={treatment.imageUrl} alt="" loading="lazy" style={{ objectPosition: treatment.imagePosition }} />
                          : <span className="treatment-card-image-placeholder">Roar Wellness</span>}
                      </div>
                    )}
                    <div className="treatment-card-content">
                      <h3 className="treatment-card-title font-serif text-[clamp(1.7rem,2vw,2.5rem)] leading-tight tracking-[-0.04em]">
                        {href ? <Link href={href}>{treatment.title}</Link> : treatment.title}
                      </h3>
                      {href
                        ? <Link href={href} className="treatment-card-description">{treatment.description}</Link>
                        : <p className="treatment-card-description">{treatment.description}</p>}
                      {href && <Link href={href} className="treatment-card-link">View treatment <span aria-hidden="true">→</span></Link>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="band-light px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
            <div className="mb-16 text-center"><p className="eyebrow text-coral">Gallery</p><h2 className="section-title mt-5 max-w-none text-olive">Inside <em>Roar Wellness</em></h2></div>
          <GalleryLightbox images={galleryImages}>
          <div className="essence-mosaic">
            <article className="mosaic-card mosaic-rooted">{renderGalleryImages(0)}</article>
            <article className="mosaic-card mosaic-personal">{renderGalleryImages(3)}</article>
            <article className="mosaic-card mosaic-feature">{renderGalleryImages(6)}</article>
            <article className="mosaic-card mosaic-quote">{renderGalleryImages(9)}</article>
            <article className="mosaic-card mosaic-timeline">{renderGalleryImages(12)}</article>
            <article className="mosaic-card mosaic-stat">{renderGalleryImages(15)}</article>
          </div>
          </GalleryLightbox>
          <div className="gallery-action"><a href="/gallery" className="gallery-view-more">View more <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>

      <section id="facility" className="facility-section bg-[#f8f4f6] px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="facility-heading-row mb-12">
            <div>
              <p className="eyebrow text-coral">Roar Wellness Rehabilitation Centre</p>
              <h2 className="section-title mt-5 text-olive">Our <em>facility</em></h2>
            </div>
            <div className="facility-intro">
              <p>ROAR aims to give the best quality care in residential treatment for substance use disorder, in a safe, secure and supportive environment.</p>
              <Link href="/facility/" className="arrow-link mt-5 inline-flex text-olive">Explore our facility <span aria-hidden="true">↗</span></Link>
            </div>
          </div>

          <div className="facility-carousel" aria-roledescription="carousel" aria-label="Roar Wellness facility gallery">
            <div className="facility-viewport">
              <div className="facility-track" style={{ transform: `translateX(-${facilityIndex * (100 / loopingFacilitySlides.length)}%)` }}>
                {loopingFacilitySlides.map(([title, description, image], index) => (
                  <article key={`${title}-${index}`} className="facility-slide" aria-hidden={index >= activeFacilitySlides.length} aria-label={`${(index % activeFacilitySlides.length) + 1} of ${activeFacilitySlides.length}`}>
                    <div className="facility-image-wrap"><img src={image} alt={`${title} at Roar Wellness`} className="facility-image" /></div>
                    <div className="facility-card-copy"><p className="facility-index">0{index + 1}</p><h3>{title}</h3><p>{description}</p></div>
                  </article>
                ))}
              </div>
            </div>
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

      <section id="team" className="team-section bg-sand px-6 py-20 md:px-12 md:py-28">
        <div className="site-container">
          <div className="team-heading-row mb-14">
            <div className="team-heading-copy"><p className="eyebrow text-coral">Meet the team</p><h2 className="section-title mt-5 max-w-none text-olive">People who make <em>recovery possible</em></h2></div>
            <Link href="/drug-alcohol-rehabilitation-experts/" className="arrow-link text-olive">View all experts <span>↗</span></Link>
          </div>
          <div className="team-grid">
            {activeTeam.map(([name, role, bio, image], index) => (
              <article key={name} className={`team-card team-card-${index + 1}`}>
                <div className="team-image-wrap"><img src={image} alt={name} className="team-image" /></div>
                <div className="team-card-copy"><p className="team-index">0{index + 1}</p><h3>{name}</h3><p className="team-role">{role}</p><p className="team-bio">{bio}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection reviews={activeReviews} />
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
