/** Standard discovery / filter categories (matches DB seed). */
export const STANDARD_EVENT_CATEGORIES = [
  "Music",
  "Sports",
  "Technology",
  "Business",
  "Arts",
  "Food & Drink",
  "Health & Wellness",
  "Education",
  "Entertainment",
] as const;

/** Cultural taxonomy categories (matches DB seed V6). */
export const CULTURAL_EVENT_CATEGORIES = [
  "Gala & Fundraiser",
  "National Day Celebration",
  "Diaspora Film Screening",
  "Community Gathering",
  "Religious & Spiritual",
  "Cultural Festival",
  "Afrobeat Concert",
  "Caribbean Night",
  "Latin Fiesta",
] as const;

/** All categories for event creation dropdowns — names must match `categories.name` in the DB. */
export const EVENT_FORM_CATEGORIES = [
  ...STANDARD_EVENT_CATEGORIES,
  ...CULTURAL_EVENT_CATEGORIES,
  "Conference",
  "Comedy",
  "Theater",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_FORM_CATEGORIES)[number];
