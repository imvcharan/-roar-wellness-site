const publicCmsSettingKeys = new Set([
  "siteName",
  "siteDescription",
  "siteUrl",
  "seoTitle",
  "seoDescription",
  "homepageHeroTitle",
  "homepageHeroEyebrow",
  "homepageHeroDescription",
  "homepageApproachTitle",
  "homepageApproachEyebrow",
  "homepageApproachDescription",
  "homepagePersonalizedCareTitle",
  "homepagePersonalizedCareDescription",
  "homepagePersonalizedCareImage1",
  "homepagePersonalizedCareImage2",
  "homepageCareInterludeImage1",
  "homepageCareInterludeImage2",
  "homepageCareInterludeImage3",
  "homepageRootedRecoveryImage1",
  "homepageRootedRecoveryImage2",
  "contactEmail",
  "contactPhone",
  "contactWhatsApp",
  "contactAddress",
  "postsPerPage",
]);

export function getPublicCmsSettings(settings: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(settings).filter(([key]) => publicCmsSettingKeys.has(key)),
  );
}
