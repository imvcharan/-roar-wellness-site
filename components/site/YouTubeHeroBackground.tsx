"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface YouTubePlayer {
  destroy(): void;
  mute(): void;
  playVideo(): void;
}

interface YouTubeIframeApi {
  Player: new (
    iframe: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: { target: YouTubePlayer }) => void;
        onAutoplayBlocked?: () => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
  }
}

export function YouTubeHeroBackground() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    const YouTube = window.YT;
    if (!apiReady || !origin || !iframe || !YouTube?.Player || playerRef.current) return;

    const player = new YouTube.Player(iframe, {
      events: {
        onReady: ({ target }) => {
          target.mute();
          target.playVideo();
        },
        onAutoplayBlocked: () => console.warn("The browser blocked autoplay for the homepage hero video."),
      },
    });
    playerRef.current = player;

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [apiReady, origin]);

  const source = new URL("https://www.youtube.com/embed/zmzAImnceg8");
  source.search = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    enablejsapi: "1",
    loop: "1",
    mute: "1",
    origin,
    playlist: "zmzAImnceg8",
    playsinline: "1",
    rel: "0",
  }).toString();

  return (
    <>
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
        onReady={() => setApiReady(true)}
      />
      <iframe
        ref={iframeRef}
        title="Roar Wellness hero background"
        src={source.toString()}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        className="hero-video"
        aria-hidden="true"
      />
    </>
  );
}
