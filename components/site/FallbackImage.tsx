"use client";

import type { ImgHTMLAttributes } from "react";

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
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
        if (image.getAttribute("src") === fallbackSrc) return;
        image.onerror = null;
        image.src = fallbackSrc;
      }}
    />
  );
}
