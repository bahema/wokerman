-- 002_seed_published.sql
-- Seeds a default published record only if one does not already exist.

INSERT INTO site_content (id, kind, content_json, updated_at)
SELECT
  'site-published-default',
  'published',
  '{
    "branding": { "logoText": "AutoHub", "accentColor": "#2563eb", "defaultTheme": "system" },
    "socials": { "facebookUrl": "https://facebook.com", "whatsappUrl": "https://wa.me/", "other": [] },
    "hero": {
      "headline": "Discover next-gen tools for Forex, Betting, and Social growth.",
      "subtext": "Curated products with fast onboarding, premium UX, and trusted workflows to help you execute faster and scale smarter.",
      "ctaPrimary": { "label": "Explore Forex Tools", "target": "forex" },
      "ctaSecondary": { "label": "See New Releases", "target": "betting" },
      "stats": [
        { "label": "Active users", "value": "12.4k" },
        { "label": "Avg. rating", "value": "4.8" },
        { "label": "Live tools", "value": "24" }
      ]
    },
    "testimonials": [],
    "products": { "forex": [], "betting": [], "software": [], "social": [] },
    "industries": [
      { "id": "ind-1", "label": "Finance", "icon": "💹" },
      { "id": "ind-2", "label": "Sports Betting", "icon": "🎯" }
    ],
    "footer": {
      "note": "Premium product discovery for automation-first digital operators.",
      "copyright": "© 2026 AutoHub. All rights reserved."
    }
  }'::jsonb,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM site_content WHERE kind = 'published'
);
