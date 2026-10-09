"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { AppointmentShowcase } from "@/components/site/AppointmentShowcase";
import { getCmsContentHref } from "@/lib/cms-routes";
import { normalizeCmsPlainText } from "@/lib/cms-text";
import { cmsRequest } from "@/services/cms-api";

interface BlogEntry {
  title: string;
  slug: string;
  category_name: string;
  category_slug: string;
  excerpt: string | null;
  summary: string | null;
  image_url: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  featured_image_position: string;
  published_at: string | null;
}

function formatPublishedDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [message, setMessage] = useState("Loading published articles...");
  const [contactPhone, setContactPhone] = useState("+919319977207");
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: BlogEntry[] }>("/api/content/blog")
      .then(({ data }) => {
        if (!mounted) return;
        setPosts(data);
        setMessage(data.length ? "" : "No articles have been published yet.");
      })
      .catch((error: unknown) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "Articles are temporarily unavailable.");
      });
    cmsRequest<{ data: { contactPhone?: string } }>("/api/content/settings")
      .then(({ data }) => { if (mounted && data.contactPhone) setContactPhone(data.contactPhone); })
      .catch((error: unknown) => console.error("Unable to load contact settings.", error));
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    posts.forEach((post) => unique.set(post.category_slug, post.category_name));
    return Array.from(unique, ([slug, name]) => ({ slug, name }));
  }, [posts]);
  const visiblePosts = selectedCategory
    ? posts.filter((post) => post.category_slug === selectedCategory)
    : posts;
  const featuredPosts = [...posts]
    .sort((first, second) => Number(Boolean(second.featured_image_url || second.image_url)) - Number(Boolean(first.featured_image_url || first.image_url)))
    .slice(0, 2);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const targets = page.querySelectorAll<HTMLElement>(".blog-reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-revealed"));
      return;
    }
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    targets.forEach((target) => revealObserver.observe(target));
    return () => revealObserver.disconnect();
  }, [posts, selectedCategory]);

  const renderCard = (post: BlogEntry, index: number, featured = false) => {
    const href = getCmsContentHref(post.slug, post.category_slug);
    const image = post.featured_image_url || post.image_url;
    const date = formatPublishedDate(post.published_at);
    const summary = normalizeCmsPlainText(post.excerpt || post.summary || "");
    return (
      <article key={`${featured ? "featured-" : ""}${post.slug}`} className={`blog-story-card blog-reveal${featured ? " blog-story-card-featured" : ""}`}>
        <Link href={href} className={`blog-story-image${image ? "" : " blog-story-image-placeholder"}`} aria-label={`Read ${post.title}`}>
          {image
            ? <img src={image} alt={post.featured_image_alt || ""} loading={index < 2 ? "eager" : "lazy"} style={{ objectPosition: post.featured_image_position || "50% 50%" }} />
            : <span className="blog-story-image-mark" aria-hidden="true">Roar<br />Wellness</span>}
          <span className="blog-story-image-action" aria-hidden="true"><ArrowUpRight size={19} /></span>
        </Link>
        <div className="blog-story-copy">
          <div className="blog-story-meta">
            <span className="blog-story-category">{post.category_slug === "blog" ? "Journal" : post.category_name}</span>
            {date && <time dateTime={post.published_at || undefined}>{date}</time>}
          </div>
          <h2><Link href={href}>{post.title}</Link></h2>
          {summary && <p className="blog-story-summary">{summary}</p>}
          <Link href={href} className="blog-story-read-link">Read the story <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </article>
    );
  };

  return (
    <main ref={pageRef} className="content-archive content-archive-blog blog-page">
      <header className="blog-page-hero">
        <div className="blog-page-hero-top">
          <p className="blog-page-kicker">Roar Wellness Journal</p>
          <p className="blog-page-hero-note">Care, recovery &amp; the wisdom to keep growing.</p>
        </div>
        <div className="blog-page-hero-bottom">
          <h1>News &amp; <em>insights</em></h1>
          <a href="#featured-stories" aria-label="Explore the latest stories"><ArrowDown size={24} strokeWidth={1.4} /></a>
        </div>
        <p className="blog-page-intro">Thoughtful perspectives on recovery, mental wellbeing, and the journey toward lasting change.</p>
      </header>

      <div className="blog-page-divider" aria-hidden="true"><span>+</span></div>

      {featuredPosts.length > 0 && <section id="featured-stories" className="blog-featured-section" aria-labelledby="blog-featured-title">
        <div className="blog-section-heading blog-reveal">
          <div>
            <p className="blog-section-kicker">From the journal</p>
            <h2 id="blog-featured-title">Stories to start with</h2>
          </div>
          <p>Personal experiences and practical guidance for every step forward.</p>
        </div>
        <div className="blog-featured-grid">
          {featuredPosts.map((post, index) => renderCard(post, index, true))}
        </div>
      </section>}

      <section id="all-stories" className="blog-all-section" aria-labelledby="blog-all-title">
        <div className="blog-section-heading blog-reveal">
          <div>
            <p className="blog-section-kicker">Explore at your own pace</p>
            <h2 id="blog-all-title">The journal</h2>
          </div>
          <p>Browse our latest articles and find the insight that speaks to you.</p>
        </div>
        {categories.length > 1 && <div className="blog-category-filters" role="group" aria-label="Filter articles by category">
          <button type="button" aria-pressed={!selectedCategory} className={!selectedCategory ? "is-active" : ""} onClick={() => setSelectedCategory("")}>All</button>
          {categories.map((item) => <button key={item.slug} type="button" aria-pressed={selectedCategory === item.slug} className={selectedCategory === item.slug ? "is-active" : ""} onClick={() => setSelectedCategory(item.slug)}>{item.name}</button>)}
        </div>}
        {visiblePosts.length
          ? <div className="blog-story-grid" aria-live="polite">{visiblePosts.map((post, index) => renderCard(post, index))}</div>
          : <p role="status" className="blog-empty">{posts.length ? "No articles are available in this category." : message}</p>}
      </section>

      <AppointmentShowcase phone={contactPhone} />
    </main>
  );
}
