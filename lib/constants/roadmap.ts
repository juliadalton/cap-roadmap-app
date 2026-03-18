export const CATEGORIES = ["Product", "AI", "Integrations", "Branding", "Migrations"] as const;
export type Category = typeof CATEGORIES[number];

export const STATUSES = ["planned", "in-progress", "completed"] as const;
export type Status = typeof STATUSES[number];

export const PIRATE_METRICS_OPTIONS = [
  "Acquisition",
  "Activation",
  "Revenue",
  "Retention",
  "Referral",
] as const;

export const NORTH_STAR_METRICS_OPTIONS = [
  "Increase Automated Deflections",
  "Reduce Average Handle Time",
  "Increase Automated Processes",
  "Increase in Conversions",
] as const;
