export function faqAnchorId(question: string): string {
  return `faq-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
