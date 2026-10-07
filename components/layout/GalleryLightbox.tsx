"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

export function GalleryLightbox({ images, children }: { images: string[]; children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const close = () => setActiveIndex(null);
  const showPrevious = () => setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length);
  const showNext = () => setActiveIndex((current) => current === null ? null : (current + 1) % images.length);

  useEffect(() => {
    if (activeIndex === null) return;
    setZoom(1);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
      if (event.key === "+" || event.key === "=") setZoom((current) => Math.min(3, current + 0.25));
      if (event.key === "-") setZoom((current) => Math.max(.75, current - 0.25));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex]);

  return (
    <>
      <div onClick={(event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>("[data-gallery-index]");
        if (target) setActiveIndex(Number(target.dataset.galleryIndex));
      }}>
        {children}
      </div>
      {activeIndex !== null && (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Gallery image viewer" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="gallery-lightbox-toolbar">
            <span className="gallery-counter">{activeIndex + 1} / {images.length}</span>
            <div className="gallery-controls">
              <button type="button" onClick={() => setZoom((current) => Math.max(.75, current - .25))} aria-label="Zoom out"><ZoomOut size={18} /></button>
              <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom"><RotateCcw size={18} /></button>
              <button type="button" onClick={() => setZoom((current) => Math.min(3, current + .25))} aria-label="Zoom in"><ZoomIn size={18} /></button>
              <button type="button" onClick={close} aria-label="Close image viewer"><X size={20} /></button>
            </div>
          </div>
          <button type="button" className="gallery-lightbox-arrow gallery-lightbox-previous" onClick={showPrevious} aria-label="Previous gallery image"><ChevronLeft size={26} /></button>
          <div className="gallery-lightbox-image-wrap">
            <img src={images[activeIndex]} alt="Roar Wellness gallery" className="gallery-lightbox-image" style={{ transform: `scale(${zoom})` }} />
          </div>
          <button type="button" className="gallery-lightbox-arrow gallery-lightbox-next" onClick={showNext} aria-label="Next gallery image"><ChevronRight size={26} /></button>
        </div>
      )}
    </>
  );
}
