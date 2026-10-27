import { homepageSeeds } from "@/lib/homepage-seed-data";

export interface TeamProfile {
  section_key: string;
  heading: string;
  eyebrow: string;
  body: string;
  image_url: string;
}

export const defaultTeamProfiles: TeamProfile[] = homepageSeeds
  .filter((item) => item.group === "team")
  .map((item) => ({
    section_key: item.key,
    heading: item.heading,
    eyebrow: item.eyebrow,
    body: item.body,
    image_url: item.imageUrl,
  }));

export function TeamProfilesGrid({ profiles }: { profiles: TeamProfile[] }) {
  return (
    <div className="team-grid" role="list" aria-label="Roar Wellness team">
      {profiles.map((profile) => (
        <article key={profile.section_key} className="team-card" role="listitem">
          <div className="team-image-wrap">
            {profile.image_url
              ? <img src={profile.image_url} alt={profile.heading} loading="lazy" className="team-image" />
              : <span className="team-image-placeholder" aria-hidden="true" />}
          </div>
          <div className="team-card-copy">
            <h3>{profile.heading}</h3>
            {profile.eyebrow && <p className="team-role">{profile.eyebrow}</p>}
            {profile.body && <p className="team-bio">{profile.body}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
