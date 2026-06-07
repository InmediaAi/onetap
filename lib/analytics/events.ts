/**
 * Analytics event catalog — the single source of truth for the taxonomy.
 * Add events here, then call track(EVENTS.x, props) so names stay consistent.
 * This file is provider-agnostic (no Mixpanel import).
 */

export const EVENTS = {
  // Session / navigation
  PAGE_VIEWED: "page_viewed",
  SIGNED_IN: "signed_in",

  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  FACE_UPLOADED: "face_uploaded",
  BODY_UPLOADED: "body_uploaded",
  ONBOARDING_BRANDS_SELECTED: "onboarding_brands_selected",
  IDENTITY_CAPTURED: "identity_captured",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Discovery
  PRODUCT_TRY_CLICKED: "product_try_clicked",
  CATALOG_FILTERED: "catalog_filtered",
  PRODUCT_WISHLISTED: "product_wishlisted",
  PRODUCT_UNWISHLISTED: "product_unwishlisted",

  // Generation funnel
  GENERATION_STARTED: "generation_started",
  GENERATION_COMPLETED: "generation_completed",
  GENERATION_FAILED: "generation_failed",
  LOOK_CREATED: "look_created",

  // Output / sharing
  RESULT_SHARED: "result_shared",
  RESULT_DOWNLOADED: "result_downloaded",

  // Subscription / limit funnel
  PRICING_OPENED: "pricing_opened",
  VIDEO_LIMIT_REACHED: "video_limit_reached",
  FREE_TRIAL_VIDEO_USED: "free_trial_video_used",
  SUBSCRIBE_CLICKED: "subscribe_clicked",
  SUBSCRIPTION_ACTIVATED: "subscription_activated",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  TOPUP_CLICKED: "topup_clicked",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
