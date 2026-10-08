"use client";

import Link from "next/link";
import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { getCmsCategoryLabel, getCmsContentHref, getCmsRouteKind, isLocationService, isServiceCategory } from "@/lib/cms-routes";
import { normalizeCmsPlainText } from "@/lib/cms-text";
import { cmsRequest } from "@/services/cms-api";
import { DetailTestimonialsFaq } from "@/components/site/TestimonialsFaq";
import { ContactSection } from "@/components/site/ContactSection";
import { GalleryVideoGrid } from "@/components/layout/GalleryVideoGrid";
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

function CmsPageContent({ html, slug, centerMedia = false }: { html: string; slug: string; centerMedia?: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

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
    };

    removeEmbeddedSections();
    const observer = new MutationObserver(removeEmbeddedSections);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [html]);

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
    className={`cms-page-content${slug === "about-roarwellness" ? " cms-about-page" : ""}${slug === "drug-alcohol-rehabilitation-experts" ? " cms-experts-page" : ""}${centerMedia ? " cms-centered-media" : ""}`}
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
    const summary = isExpertsPage
      ? "Meet the experienced clinicians and recovery professionals who guide care at Roar Wellness."
      : !isVideosPage && (selectedItem?.excerpt || selectedItem?.summary)
        ? normalizeCmsPlainText(selectedItem.excerpt || selectedItem.summary || "")
        : null;
    const pageVideos = isVideosPage
      ? getYouTubeVideos(selectedItem?.excerpt, selectedItem?.summary, selectedItem?.content, selectedItem?.description)
      : [];
    const image = selectedItem?.featured_image_url || selectedItem?.image_url;
    const selectedCategorySlug = selectedItem?.category_slug;
    const selectedKind = detailKind ?? (selectedItem ? getCmsRouteKind(selectedItem.category_slug) : "service");
    const selectedCategory = selectedItem ? getCmsCategoryLabel(selectedItem.category_slug) : "Content";
    const relatedItems = allItems
      .filter((item) => item.slug !== selectedSlug && item.category_slug === selectedCategorySlug)
      .slice(0, 4);

    if (selectedItem && selectedKind === "page" && selectedSlug.toLowerCase() === "contact-us") {
      return (
        <main className="pb-20 pt-40 md:pb-24">
          <section className="contact-page-hero px-6 text-cream md:px-12">
            <div className="site-container">
              <p className="contact-page-hero-kicker">Roar Wellness</p>
              <h1>Contact Us</h1>
              <p>Reach out for a confidential conversation about care, recovery, and the next step for you or someone you care about.</p>
            </div>
          </section>
          <ContactSection
            contactEmail={contactEmail}
            contactPhone={contactPhone}
            contactWhatsApp={contactWhatsApp}
            contactAddress={contactAddress}
            appearance="light"
          />
        </main>
      );
    }

    return (
      <main className="pb-20 pt-40 md:pb-24">
        {selectedItem && <nav aria-label="Breadcrumb" className="site-container px-5">
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
        </nav>}
        {selectedItem ? <>
          <section className="detail-hero-band mt-6" aria-labelledby="treatment-detail-title">
            <div className="site-container px-5">
              <div className={image ? "detail-hero" : "detail-hero detail-hero-no-media"}>
              <div className="detail-hero-copy">
                <p className="detail-hero-kicker">{isExpertsPage ? "Meet the people behind your care" : selectedKind === "blog" ? "From the Roar Wellness journal" : selectedKind === "page" ? selectedCategory : selectedItem && isLocationService(selectedItem.slug) ? "Care close to home" : "Treatment and recovery"}</p>
                <h1 id="treatment-detail-title" className="detail-hero-title">{selectedItem.title}</h1>
                {summary && <p className="detail-hero-summary">{summary}</p>}
                {selectedKind === "service" && <a className="detail-hero-cta" href="tel:+919319977207">Speak with our team <span aria-hidden="true">›</span></a>}
                {selectedKind === "blog" && <Link className="detail-hero-cta" href="/blog">Explore more articles <span aria-hidden="true">›</span></Link>}
                {selectedKind === "service" && <p className="detail-hero-note">Private, supportive, and without obligation</p>}
              </div>
              {image && <div className="detail-hero-media"><img src={image} alt={selectedItem.featured_image_alt || ""} style={{ objectPosition: selectedItem.featured_image_position || "50% 50%" }} className="detail-hero-image" /></div>}
              </div>
            </div>
          </section>

          <div className="site-container px-5">
            <div className={`detail-layout ${selectedKind === "service" || selectedKind === "blog" ? "" : "detail-layout-full"} mt-10 md:mt-14`}>
              <article className="detail-article">
                {isVideosPage
                  ? pageVideos.length
                    ? <GalleryVideoGrid videos={pageVideos} gridClassName="cms-videos-page-grid" />
                    : <p role="status">Videos are temporarily unavailable. Please check back soon.</p>
                  : (selectedItem.content || selectedItem.description) && <CmsPageContent
                    html={selectedItem.content || selectedItem.description || ""}
                    slug={selectedSlug}
                    centerMedia={selectedKind === "blog" || selectedKind === "service"}
                  />}
              </article>

              <aside className="detail-sidebar" aria-label="Related information">
                {selectedKind === "service" && <section className="detail-sidebar-card detail-help-card">
                  <p className="eyebrow">Here for you</p>
                  <h2>Not sure where to start?</h2>
                  <p>Speak with our team about care options and the next step that feels right for you.</p>
                  <a className="detail-sidebar-action" href="tel:+919319977207"><Phone size={16} aria-hidden="true" />Call +91 93199 77207</a>
                  <a className="detail-sidebar-email" href="mailto:help@roarwellness.org"><Mail size={15} aria-hidden="true" />Email our team</a>
                </section>}

                {relatedItems.length > 0 && <nav className="detail-sidebar-card detail-related" aria-label={`Related ${selectedKind === "blog" ? "articles" : selectedCategory.toLowerCase()}`}>
                  <p className="eyebrow">Keep exploring</p>
                  <h2>Related {selectedKind === "blog" ? "articles" : selectedCategory.toLowerCase()}</h2>
                  <ul>
                    {relatedItems.map((item) => <li key={item.slug}>
                      <a href={getCmsContentHref(item.slug, item.category_slug)}>{item.title}<ArrowUpRight size={15} aria-hidden="true" /></a>
                    </li>)}
                  </ul>
                  <a className="detail-browse-link" href={selectedKind === "blog" ? "/blog/" : "/services/"}>Browse {selectedKind === "blog" ? "all articles" : "all services"} <span aria-hidden="true">→</span></a>
                </nav>}
              </aside>
            </div>

          </div>

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
    <main className={`site-container px-5 pb-20 pt-40 md:pb-24 ${listingKind === "services" ? "content-archive content-archive-services" : "content-archive"}`}>
      <header className="archive-heading">
        <p className="eyebrow text-terracotta">Roar Wellness</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight text-brown md:text-6xl">{listingKind === "services" ? "Services" : "Treatments & site pages"}</h1>
        <p className="archive-intro">{listingKind === "services" ? "Explore care for recovery, therapy, and mental wellbeing." : "Published treatment information, therapy, mental healthcare, and pages from Roar Wellness."}</p>
      </header>

      <section aria-label="Browse services">
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

        {allItems.length > 0 && <p className="archive-result-count" aria-live="polite">
          {visibleItems.length} {visibleItems.length === 1 ? "result" : "results"}
          {category ? ` in ${categories.find((item) => item.slug === category)?.name || category}` : ""}
        </p>}

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
    </main>
  );
}