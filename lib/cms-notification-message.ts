export function buildEnquiryNotification(createdAt: string, baseUrl: string, from: string, to: string) {
  const safeBaseUrl = baseUrl.replace(/\/+$/, "");
  return {
    from,
    to,
    subject: "New website enquiry",
    text: `A new website enquiry was received at ${createdAt}.\nReview it in the secure admin inbox: ${safeBaseUrl}/admin/enquiries`,
  };
}
