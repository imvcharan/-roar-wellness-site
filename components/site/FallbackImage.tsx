"use client";

import type { ImgHTMLAttributes } from "react";

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string | null;
}

export function FallbackImage({
  fallbackSrc = "/images/rooted-recovery-campus.webp",
  ...imageProps
}: FallbackImageProps) {
  return (
    <img
      {...imageProps}
      onError={(event) => {
        const image = event.currentTarget;
        if (fallbackSrc === null) {
          image.hidden = true;
          image.style.display = "none";
          image.parentElement?.classList.add("image-unavailable");
          return;
        }
        if (image.getAttribute("src") === fallbackSrc) return;
        image.onerror = null;
        image.src = fallbackSrc;
      }}
    />
  );
}
