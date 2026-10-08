"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCmsContentHref } from "@/lib/cms-routes";
import { cmsRequest } from "@/services/cms-api";

interface BlogEntry {
  title: string;
  slug: string;
  category_slug: string;
  excerpt: string | null;
  summary: string | null;
  image_url: string | null;
  featured_image_alt: string | null;
  featured_image_position: string;
  published_at: string | null;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogEntry[]>([]);
  const [message, setMessage] = useState("Loading published articles...");

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
    return () => { mounted = false; };
  }, []);

  return (
    <main className="site-container content-archive content-archive-blog px-4 py-24">
      <header className="archive-heading">
        <p className="eyebrow text-terracotta">Roar Wellness journal</p>
        <h1 className="mt-4 font-serif tracking-tight">News &amp; insights</h1>
        <p className="archive-intro">Thoughtful perspectives on recovery, mental wellbeing, and the journey toward lasting change.</p>
      </header>
      {posts.length ? <div className="blog-archive-list">
        {posts.map((post) => {
          const href = getCmsContentHref(post.slug, post.category_slug);
          return (
          <article key={post.slug} className="blog-archive-card group grid gap-0 md:grid-cols-[minmax(14rem,.8fr)_minmax(0,1.2fr)]">
            <Link href={href} aria-label={`Read ${post.title}`} className={`blog-card-image ${post.image_url ? "" : "blog-card-image-placeholder"}`}>
              {post.image_url
                ? <img src={post.image_url} alt={post.featured_image_alt || ""} loading="lazy" style={{ objectPosition: post.featured_image_position || "50% 50%" }} />
                : <span aria-hidden="true">Roar Wellness</span>}
            </Link>
            <div className="blog-archive-card-copy flex flex-col justify-center">
              <h2 className="blog-archive-card-title mb-3 transition-colors">
                <Link href={href}>{post.title}</Link>
              </h2>
              {post.published_at && <p className="blog-archive-card-date mb-4 font-body text-xs font-semibold uppercase tracking-[.12em]">{new Date(post.published_at).toLocaleDateString()}</p>}
              {(post.excerpt || post.summary) && <p className="blog-archive-card-summary font-body text-sm leading-relaxed">{post.excerpt || post.summary}</p>}
            </div>
          </article>
          );
        })}
      </div> : <p role="status" className="py-8 text-center text-brown-muted">{message}</p>}
      <div className="mt-12 text-center"><Link href="/" className="font-medium text-terracotta hover:text-terracotta/80">← Back to Home</Link></div>
    </main>
  );
}
