"use client";

import { useEffect, useRef, useState } from "react";

interface EngagementStats {
  views: number;
  likes: number;
  shares: number;
  liked: boolean;
}

interface EngagementResponse {
  data?: EngagementStats;
  error?: string;
}

async function requestEngagement(
  slug: string,
  event?: "view" | "like" | "share",
): Promise<EngagementStats> {
  const response = await fetch(`/api/content/blog/${encodeURIComponent(slug)}/engagement`, {
    ...(event ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    } : {}),
    cache: "no-store",
  });
  const result = await response.json() as EngagementResponse;
  if (!response.ok || !result.data) {
    throw new Error(result.error || "Post engagement could not be updated.");
  }
  return result.data;
}

export function BlogPostEngagement({ slug, title }: { slug: string; title: string }) {
  const [stats, setStats] = useState<EngagementStats>({ views: 0, likes: 0, shares: 0, liked: false });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lastViewedSlug = useRef("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const currentStats = await requestEngagement(slug);
        if (active) setStats(currentStats);

        if (lastViewedSlug.current !== slug) {
          lastViewedSlug.current = slug;
          const updatedStats = await requestEngagement(slug, "view");
          if (active) setStats(updatedStats);
        }
      } catch {
        if (active) setError("Post engagement counts could not be loaded. Please try again later.");
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const recordAction = async (event: "like" | "share") => {
    setError("");
    setNotice("");
    try {
      setStats(await requestEngagement(slug, event));
      return true;
    } catch {
      setError("Your action could not be recorded. Please try again.");
      return false;
    }
  };

  const likePost = async () => {
    if (stats.liked || !ready) return;
    await recordAction("like");
  };

  const sharePost = async () => {
    setError("");
    setNotice("");
    let shared = false;
    let copied = false;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        shared = true;
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        shared = true;
        copied = true;
      } else {
        setError("Sharing is not supported in this browser.");
        return;
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError("The article could not be shared. Please try again.");
      return;
    }

    if (shared && !await recordAction("share")) {
      setError("The article was shared, but the share count could not be updated.");
    } else if (copied) {
      setNotice("Article link copied to clipboard.");
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-cms-border bg-cms-background p-5" aria-label="Article engagement">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-medium text-cms-text">
          {ready ? `${stats.views} ${stats.views === 1 ? "view" : "views"}` : "Loading views…"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void likePost()}
            disabled={!ready || stats.liked}
            aria-pressed={stats.liked}
            className="rounded-lg border border-cms-border bg-white px-4 py-2 text-sm font-medium text-cms-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stats.liked ? "Liked" : "Like"} · {stats.likes}
          </button>
          <button
            type="button"
            onClick={() => void sharePost()}
            disabled={!ready}
            className="rounded-lg border border-cms-border bg-white px-4 py-2 text-sm font-medium text-cms-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            Share · {stats.shares}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-green-800">{notice}</p>}
    </section>
  );
}
