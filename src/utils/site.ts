export const SITE = {
  name: 'IFL PvP MegaGuides',
  shortName: 'IFL PvP',
  title: 'IFL PvP MegaGuides — Competitive Game Reference Library',
  description:
    'Source-backed, patch-aware competitive PvP guides with visible review dates, evidence trails, and correction paths.',
  url: 'https://iflpvp.com',
  language: 'en-US',
  repository: 'https://github.com/Jstn-1g/ifl-pvp-megaguides',
  copyrightYear: 2026,
} as const;

export const NAVIGATION = [
  { href: '/guides/', label: 'MegaGuides' },
  { href: '/archive/', label: 'Archive' },
  { href: '/editorial-policy/', label: 'Standards' },
  { href: '/support/', label: 'Support' },
] as const;
