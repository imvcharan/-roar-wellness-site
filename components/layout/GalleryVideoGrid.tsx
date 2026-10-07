"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { galleryVideos } from "@/lib/gallery-videos";
import type { YouTubeVideo } from "@/lib/youtube-videos";

export function GalleryVideoGrid({ videos = galleryVideos, gridClassName = "" }: { videos?: YouTubeVideo[]; gridClassName?: string }) {
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  useEffect(() => {
    if (!activeVideo) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveVideo(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeVideo]);

  return (
    <>
      <div className={`gallery-page-grid gallery-video-grid ${gridClassName}`}>
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            className="gallery-page-item gallery-video-item"
            onClick={() => setActiveVideo(video)}
            aria-label={`Play ${video.title}`}
          >
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="gallery-video-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
            <span className="gallery-video-title">{video.title}</span>
          </button>
        ))}
      </div>
      {activeVideo && (
        <div
          className="gallery-video-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={activeVideo.title}
          onClick={(event) => { if (event.target === event.currentTarget) setActiveVideo(null); }}
        >
          <div className="gallery-video-dialog">
            <div className="gallery-video-toolbar">
              <h2>{activeVideo.title}</h2>
              <button type="button" onClick={() => setActiveVideo(null)} aria-label="Close video"><X size={22} /></button>
            </div>
            <div className="gallery-video-frame-wrap">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
