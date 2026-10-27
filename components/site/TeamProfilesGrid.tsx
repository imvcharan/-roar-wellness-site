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

export function TeamFaceCluster({ profiles }: { profiles: TeamProfile[] }) {
  const featuredProfiles = profiles.slice(0, 3);
  const additionalCount = Math.max(0, profiles.length - featuredProfiles.length);

  if (!featuredProfiles.length) return null;

  return (
    <div className="team-preview" aria-label="Meet some of our team">
      <div className="team-face-stack" aria-hidden="true">
        {featuredProfiles.map((profile) => (
          <span className="team-face" key={profile.section_key}>
            {profile.image_url
              ? <img src={profile.image_url} alt="" loading="lazy" />
              : profile.heading.trim().charAt(0).toUpperCase()}
          </span>
        ))}
        {additionalCount > 0 && <span className="team-face team-face-count">+{additionalCount}</span>}
      </div>
      <ul className="team-preview-roster">
        {featuredProfiles.map((profile) => (
          <li key={profile.section_key}>
            <span className="team-preview-name">{profile.heading}</span>
            {profile.eyebrow && <span className="team-preview-role">{profile.eyebrow}</span>}
          </li>
        ))}
        {additionalCount > 0 && <li className="team-preview-more">+{additionalCount} more team {additionalCount === 1 ? "member" : "members"}</li>}
      </ul>
    </div>
  );
}

export function TeamProfilesGrid({ profiles }: { profiles: TeamProfile[] }) {
  return (
    <div className="team-grid" role="list" aria-label="Roar Wellness team">
      {profiles.map((profile, index) => (
        <article key={profile.section_key} className="team-card" role="listitem">
          <div className="team-image-wrap">
            {profile.image_url
              ? <img src={profile.image_url} alt={profile.heading} loading="lazy" className="team-image" />
              : <span className="team-image-placeholder" aria-hidden="true" />}
          </div>
          <div className="team-card-copy">
            <p className="team-index">TEAM MEMBER {String(index + 1).padStart(2, "0")}</p>
            <h3>{profile.heading}</h3>
            {profile.eyebrow && <p className="team-role">{profile.eyebrow}</p>}
            {profile.body && <p className="team-bio">{profile.body}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
