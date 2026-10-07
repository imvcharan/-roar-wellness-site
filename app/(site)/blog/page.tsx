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
    <main className="site-container px-4 py-24">
      <h1 className="mb-16 text-center font-display text-4xl font-bold tracking-tight text-brown md:text-5xl">News</h1>
      {posts.length ? <div className="space-y-12">
        {posts.map((post) => {
          const href = getCmsContentHref(post.slug, post.category_slug);
          return (
          <article key={post.slug} className="group grid max-w-4xl gap-6 border-b border-beige pb-12 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Link href={href} aria-label={`Read ${post.title}`} className={`blog-card-image ${post.image_url ? "" : "blog-card-image-placeholder"}`}>
              {post.image_url
                ? <img src={post.image_url} alt={post.featured_image_alt || ""} loading="lazy" style={{ objectPosition: post.featured_image_position || "50% 50%" }} />
                : <span aria-hidden="true">Roar Wellness</span>}
            </Link>
            <div>
              <h2 className="mb-3 font-display text-xl font-bold text-brown transition-colors group-hover:text-terracotta md:text-2xl">
                <Link href={href}>{post.title}</Link>
              </h2>
              {post.published_at && <p className="mb-4 font-serif text-sm text-brown-muted">{new Date(post.published_at).toLocaleDateString()}</p>}
              {(post.excerpt || post.summary) && <p className="font-body leading-relaxed text-brown/70">{post.excerpt || post.summary}</p>}
            </div>
          </article>
          );
        })}
      </div> : <p role="status" className="py-8 text-center text-brown-muted">{message}</p>}
      <div className="mt-12 text-center"><Link href="/" className="font-medium text-terracotta hover:text-terracotta/80">← Back to Home</Link></div>
    </main>
  );
}
