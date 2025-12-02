/**
 * Brand Configuration
 * Single source of truth for project naming and branding
 */
export const BRAND_CONFIG = {
  // Names
  name: '530societynews',
  shortName: '530',
  buttonText: '530',
  tagline: 'Community-curated news discovery',

  // Colors (hex values)
  colors: {
    primary: '#3B82F6',    // Blue-500
    secondary: '#10B981',  // Green-500
    accent: '#F59E0B',     // Amber-500
    danger: '#EF4444',     // Red-500
  },

  // URLs
  urls: {
    website: 'https://530societynews.com',
    api: 'https://api.530societynews.com',
    docs: 'https://docs.530societynews.com',
    github: 'https://github.com/yourusername/TwitterBotY25',
  },

  // Social
  social: {
    twitter: '@530societynews',
    email: 'contact@530societynews.com',
  },

  // Chrome Extension Metadata
  extension: {
    name: '530societynews',
    description: 'Community-curated social media tagging for meaningful content discovery',
    version: '1.0.0',
  },
} as const;

/**
 * Supabase Configuration
 * Connection details for local and production environments
 */
export const SUPABASE_CONFIG = {
  // Local development (from `supabase status`)
  local: {
    url: 'http://127.0.0.1:54321',
    anonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  },

  // Production (to be filled when deploying)
  production: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
} as const;

// Export type-safe brand config type
export type BrandConfig = typeof BRAND_CONFIG;
export type SupabaseConfig = typeof SUPABASE_CONFIG;
