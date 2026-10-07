"use client";

import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { GalleryVideoGrid } from "@/components/layout/GalleryVideoGrid";
import { GalleryLightbox } from "@/components/layout/GalleryLightbox";
import { galleryImages } from "@/lib/gallery-images";

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");
  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab = event.key === "Home" ? "photos"
      : event.key === "End" ? "videos"
        : event.key === "ArrowRight" ? "videos" : "photos";
    setActiveTab(nextTab);
    document.getElementById(`gallery-${nextTab}-tab`)?.focus();
  };

  return (
    <main className="gallery-page">
      <section className="gallery-page-header">
        <p className="eyebrow text-coral">Roar Wellness</p>
        <h1 className="section-title text-olive">Inside <em>Roar Wellness</em></h1>
        <p className="gallery-page-intro">Photos and videos from Roar Wellness.</p>
      </section>
      <div className="gallery-tabs" role="tablist" aria-label="Gallery media type">
        <button type="button" role="tab" id="gallery-photos-tab" tabIndex={activeTab === "photos" ? 0 : -1} aria-selected={activeTab === "photos"} aria-controls="gallery-photos-panel" className={activeTab === "photos" ? "gallery-tab is-active" : "gallery-tab"} onClick={() => setActiveTab("photos")} onKeyDown={handleTabKeyDown}>Photos</button>
        <button type="button" role="tab" id="gallery-videos-tab" tabIndex={activeTab === "videos" ? 0 : -1} aria-selected={activeTab === "videos"} aria-controls="gallery-videos-panel" className={activeTab === "videos" ? "gallery-tab is-active" : "gallery-tab"} onClick={() => setActiveTab("videos")} onKeyDown={handleTabKeyDown}>Videos</button>
      </div>
      <section id="gallery-photos-panel" role="tabpanel" aria-labelledby="gallery-photos-tab" hidden={activeTab !== "photos"}>
          <GalleryLightbox images={galleryImages}>
            <div className="gallery-page-grid">
              {galleryImages.map((image, index) => (
                <button key={image} type="button" className="gallery-page-item" data-gallery-index={index} aria-label={`Open gallery image ${index + 1}`}>
                  <img src={image} alt={`Roar Wellness gallery image ${index + 1}`} loading="lazy" />
                  <span className="gallery-page-zoom" aria-hidden="true">+</span>
                </button>
              ))}
            </div>
          </GalleryLightbox>
      </section>
      <section id="gallery-videos-panel" role="tabpanel" aria-labelledby="gallery-videos-tab" hidden={activeTab !== "videos"}>
        <GalleryVideoGrid />
      </section>
      <Link href="/#top" className="gallery-back-link">Back to home <span aria-hidden="true">↗</span></Link>
    </main>
  );
}
