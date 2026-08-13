// Google services are optional.
// Add the required values to Vercel Environment Variables later.
// Example values are intentionally not hard-coded here.

export const GOOGLE_SERVICES = {
  analyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || "",
  tagManagerId: import.meta.env.VITE_GOOGLE_TAG_MANAGER_ID || "",
  adsId: import.meta.env.VITE_GOOGLE_ADS_ID || "",
  adsenseClient: import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT || "",
  searchConsoleVerification:
    import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || "",
};
