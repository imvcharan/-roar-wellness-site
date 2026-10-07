export interface YouTubeVideo {
  id: string;
  title: string;
}

const videoTitles: Record<string, string> = {
  vi7XXB9Yk6o: "Meet Dr. Manish Sarkar | Expert in Addiction Psychiatry",
  yD4slrJ84Y8: "Alcohol Dependence Syndrome | Dr. Anant, Roar Wellness",
  YePcUkLmnyw: "Inside Roar Wellness Drug Recovery Center in Delhi, India",
  "0bciOjkT0oU": "Luxury Rehab Tour: Addiction & Mental Health Care",
  EpgeB0irzBw: "The Real Way to Treat Addiction",
  Fgp09XrwRMk: "Substance Use & Recovery: RoarWellness Founder's Insights",
};

const youtubeUrlPattern = /(?:https?:\/\/)?(?:(?:www|m)\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s"'<>]*?&)?v=|(?:embed|shorts|live)\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?=$|[?&#\s"'<>]|https?:\/\/)/gi;

export function getYouTubeVideos(...sources: (string | null | undefined)[]): YouTubeVideo[] {
  const seen = new Set<string>();
  const videos: YouTubeVideo[] = [];

  for (const source of sources) {
    if (!source) continue;
    youtubeUrlPattern.lastIndex = 0;
    for (const match of source.matchAll(youtubeUrlPattern)) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);
      videos.push({ id, title: videoTitles[id] || "Roar Wellness video" });
    }
  }

  return videos;
}
