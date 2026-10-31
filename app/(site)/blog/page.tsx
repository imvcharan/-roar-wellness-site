"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { AppointmentShowcase } from "@/components/site/AppointmentShowcase";
import { getCmsCategoryLabel, getCmsContentHref } from "@/lib/cms-routes";
import { normalizeCmsPlainText } from "@/lib/cms-text";
import { cmsRequest } from "@/services/cms-api";
import { PageTitle } from "@/components/site/PageTitle";
import { formatCmsPublishedDate } from "@/lib/cms-date";
import { FallbackImage } from "@/components/site/FallbackImage";

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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [message, setMessage] = useState("Loading published articles...");
  const [contactPhone, setContactPhone] = useState("+919319977207");
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: BlogEntry[] }>("/api/content/blog?archive=true")
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
  const filteredPosts = selectedCategory
    ? posts.filter((post) => post.category_slug === selectedCategory)
    : posts;
  const featuredPosts = [...filteredPosts]
    .sort((first, second) => Number(Boolean(second.featured_image_url || second.image_url)) - Number(Boolean(first.featured_image_url || first.image_url)))
    .slice(0, 2);
  const featuredSlugs = new Set(featuredPosts.map((post) => post.slug));
  const archivePosts = filteredPosts.filter((post) => !featuredSlugs.has(post.slug));

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
    const date = formatCmsPublishedDate(post.published_at);
    const summary = normalizeCmsPlainText(post.excerpt || post.summary || "");
    const category = getCmsCategoryLabel(post.category_slug);
    return (
      <article key={`${featured ? "featured-" : ""}${post.slug}`} className={`blog-story-card blog-reveal${featured ? " blog-story-card-featured" : ""}`}>
        <Link href={href} className={`blog-story-image${image ? "" : " blog-story-image-placeholder"}`} aria-label={`Read ${post.title}`}>
          {image
            ? <FallbackImage src={image} fallbackSrc="/images/blog-sarah-recovery-community.png" alt={post.featured_image_alt || ""} loading={index < 2 ? "eager" : "lazy"} style={{ objectPosition: post.featured_image_position || "50% 50%" }} />
            : <span className="blog-story-image-mark" aria-hidden="true">Roar<br />Wellness</span>}
          <span className="blog-story-category">{category}</span>
          <span className="blog-story-image-action" aria-hidden="true"><ArrowUpRight size={19} /></span>
        </Link>
        <div className="blog-story-copy">
          <div className="blog-story-meta">
            {date && <time dateTime={post.published_at || undefined}>{date}</time>}
          </div>
          <h2><Link href={href}>{post.title}</Link></h2>
          {summary && <p className="blog-story-summary">{summary}</p>}
          <Link href={href} className="blog-story-read-link">Read article <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </article>
    );
  };

  return (
    <main ref={pageRef} className="content-archive content-archive-blog blog-page">
      <PageTitle>Blog: stories and insights</PageTitle>
      <header className="blog-page-hero">
        <div className="blog-page-hero-bottom">
          <h2>Stories &amp; <em>insights</em></h2>
          <a href="#featured-stories" aria-label="Explore featured blog articles"><ArrowDown size={24} strokeWidth={1.4} /></a>
        </div>
        <p className="blog-page-intro">Explore practical guidance and perspectives from the Roar Wellness team on treatment, mental health, and lasting recovery.</p>
      </header>

      <nav aria-label="Breadcrumb" className="blog-page-breadcrumb site-container">
        <ol>
          <li><Link href="/" className="transition-colors hover:text-terracotta">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Blog</li>
        </ol>
      </nav>

      <div className="blog-page-divider" aria-hidden="true"><span>+</span></div>

      {featuredPosts.length > 0 && <section id="featured-stories" className="blog-featured-section" aria-labelledby="blog-featured-title">
        <div className="blog-section-heading blog-reveal">
          <div>
            <p className="blog-section-kicker">Featured on the blog</p>
            <h2 id="blog-featured-title">Featured articles</h2>
          </div>
          <p>Selected perspectives and guidance from across our blog.</p>
        </div>
        <div className="blog-featured-grid">
          {featuredPosts.map((post, index) => renderCard(post, index, true))}
        </div>
      </section>}

      <section id="all-stories" className="blog-all-section" aria-labelledby="blog-all-title">
        <div className="blog-section-heading blog-reveal">
          <div>
            <p className="blog-section-kicker">Explore more from the blog</p>
            <h2 id="blog-all-title">Latest articles</h2>
          </div>
          <p>Browse articles by topic or explore everything we’ve shared.</p>
        </div>
        {categories.length > 1 && <div className="blog-category-filters" role="group" aria-label="Filter articles by category">
          <button type="button" aria-pressed={!selectedCategory} className={!selectedCategory ? "is-active" : ""} onClick={() => setSelectedCategory("")}>All topics</button>
          {categories.map((item) => <button key={item.slug} type="button" aria-pressed={selectedCategory === item.slug} className={selectedCategory === item.slug ? "is-active" : ""} onClick={() => setSelectedCategory(item.slug)}>{item.name}</button>)}
        </div>}
        {archivePosts.length
          ? <div className="blog-story-grid" aria-live="polite">{archivePosts.map((post, index) => renderCard(post, index))}</div>
          : filteredPosts.length
            ? null
          : <p role="status" className="blog-empty">{posts.length ? "No articles are available in this category." : message}</p>}
      </section>

      <AppointmentShowcase phone={contactPhone} />
    </main>
  );
}
