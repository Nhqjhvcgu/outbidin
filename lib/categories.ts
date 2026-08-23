export const CATEGORIES = [
  "Founders & Executives",
  "Recruiters & Talent",
  "Sales & Growth",
  "Marketing & Content",
  "Job Seekers",
  "Consultants & Freelancers",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Minimum bid to appear on the board at all.
export const MIN_BID_DOLLARS = 1;

export function isValidCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
