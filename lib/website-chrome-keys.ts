/** global_settings keys used by website home chrome (header, footer, branding). */
export const WEBSITE_CHROME_SETTING_KEYS = [
  'website_site_name',
  'website_site_tagline',
  'website_header_top_enabled',
  'website_header_phone',
  'website_header_whatsapp',
  'website_header_email',
  'website_social_facebook',
  'website_social_twitter',
  'website_social_instagram',
  'website_social_linkedin',
  'website_footer_copyright',
  'website_home_branding_center_slug',
  'website_hero_badge_brand',
  'website_hero_badge_title',
] as const

export type WebsiteChromeSettingKey = (typeof WEBSITE_CHROME_SETTING_KEYS)[number]
