/**
 * The deliberately small content boundary for the first public export.
 *
 * These records are newly written summaries. They do not import the private
 * editorial corpus, game-media paths, mirrored publisher data, or scraped
 * datasets. Every entry is evidence-held and deliberately non-indexable until
 * a person completes a factual review.
 */

import { PUBLIC_GAME_SCENE_PATHS } from '../lib/public-game-scenes.mjs';

export type SourceKind = 'official' | 'developer' | 'patch-notes';
export type GameKey = 'battlerite' | 'gigantic' | 'gunz' | 'marvel-rivals' | 'bloodline-champions';

export interface EvidenceSource {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly checkedAt: string;
  readonly type: SourceKind;
}

export interface ReviewDue {
  readonly state: 'review-due';
  readonly lastReviewedAt: string;
  readonly nextReviewAt: string;
  readonly reviewCadenceDays: number;
  readonly reason: string;
}

export interface PublicRoutePolicy {
  /** Preserve a previously published URL without presenting stale content as current. */
  readonly slug: string;
  readonly robots: 'noindex,follow';
  readonly indexable: false;
}

export interface PublicMegaGuide {
  readonly kind: 'mega-guide';
  readonly route: PublicRoutePolicy;
  readonly title: string;
  readonly description: string;
  /** Newly authored, intentionally concise copy suitable for the evidence-hold page. */
  readonly scope: string;
  readonly game: string;
  readonly gameKey: GameKey;
  readonly gameVersion: string;
  readonly platforms: readonly string[];
  readonly guideStatus: 'active' | 'stable';
  readonly confidence: 'low' | 'medium';
  readonly review: ReviewDue;
  readonly sources: readonly EvidenceSource[];
  /** First-party decorative art; never publisher media or guide evidence. */
  readonly coverAsset: string;
  readonly visual: 'original-ifl-illustration';
  /** Original public summaries are copyright-reserved; application code is separately licensed. */
  readonly contentRights: 'editorial-text-reserved';
}

export interface EvidenceHoldNotice {
  readonly kind: 'evidence-hold';
  readonly route: PublicRoutePolicy;
  readonly title: string;
  readonly description: string;
  readonly notice: string;
  readonly game: string;
  readonly gameKey: GameKey;
  readonly sources: readonly EvidenceSource[];
  readonly coverAsset: string;
  readonly visual: 'original-ifl-illustration';
  readonly contentRights: 'editorial-text-reserved';
}

export type PublicContentEntry = PublicMegaGuide | EvidenceHoldNotice;

const noIndex = (slug: string): PublicRoutePolicy => ({
  slug,
  robots: 'noindex,follow',
  indexable: false,
});

/**
 * Established guide routes retained as short, non-indexable evidence-held
 * summaries. `lastReviewedAt` is copied only as historical context; these
 * records do not assert a completed refresh.
 */
export const PUBLIC_MEGA_GUIDES = [
  {
    kind: 'mega-guide',
    route: noIndex('battlerite-complete-guide-every-champion'),
    title: 'Battlerite historical reference',
    description:
      'An evidence-held reference to Battlerite’s final content era. It is not a live-meta, population, or matchmaking guide.',
    scope:
      'This route is retained while the complete champion and mechanics reference is reviewed against primary historical sources. No detailed roster, ability, or balance claims are published here yet.',
    game: 'Battlerite',
    gameKey: 'battlerite',
    coverAsset: PUBLIC_GAME_SCENE_PATHS.battlerite,
    gameVersion: 'Final content build 2.3.0 (October 2019); maintenance status requires review',
    platforms: ['Windows'],
    guideStatus: 'stable',
    confidence: 'medium',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-07-15',
      nextReviewAt: '2026-08-03',
      reviewCadenceDays: 90,
      reason: 'The existing factual guide requires a new human source review before it can be indexed or expanded.',
    },
    sources: [
      {
        title: 'Battlerite on Steam',
        publisher: 'Stunlock Studios / Valve',
        url: 'https://store.steampowered.com/app/504370/Battlerite/',
        checkedAt: '2026-08-03',
        type: 'official',
      },
      {
        title: 'The Future of Battlerite',
        publisher: 'Stunlock Studios',
        url: 'https://blog.stunlock.com/the-future-of-battlerite/',
        checkedAt: '2026-08-03',
        type: 'developer',
      },
      {
        title: 'Battlerite Patch 2.3.0 / Battlerite Royale Patch 1.3.0',
        publisher: 'Stunlock Studios',
        url: 'https://blog.stunlock.com/october-update/',
        checkedAt: '2026-08-03',
        type: 'patch-notes',
      },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    route: noIndex('gigantic-complete-guide-every-hero'),
    title: 'Gigantic legacy reference',
    description:
      'An evidence-held guide for a documented legacy subset of Gigantic material; it is not a complete or current Rampage Edition roster guide.',
    scope:
      'This route is retained while the legacy material is reconciled with current official roster information. It intentionally publishes no hero builds, matchup advice, or balance guidance.',
    game: 'Gigantic: Rampage Edition',
    gameKey: 'gigantic',
    coverAsset: PUBLIC_GAME_SCENE_PATHS.gigantic,
    gameVersion: 'Legacy 21-hero subset; not the full current roster',
    platforms: ['Windows', 'PlayStation', 'Xbox'],
    guideStatus: 'stable',
    confidence: 'low',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-02-05',
      nextReviewAt: '2026-07-15',
      reviewCadenceDays: 90,
      reason: 'The previous coverage is incomplete and must be reconstructed from source-backed material before publication.',
    },
    sources: [
      {
        title: 'Gigantic: Rampage Edition on Steam',
        publisher: 'Arc Games / Valve',
        url: 'https://store.steampowered.com/app/1924490/Gigantic_Rampage_Edition/',
        checkedAt: '2026-07-15',
        type: 'official',
      },
      {
        title: 'Gigantic official site',
        publisher: 'Arc Games',
        url: 'https://www.gogigantic.com/en/',
        checkedAt: '2026-07-15',
        type: 'official',
      },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    route: noIndex('gunz-the-duel-complete-guide-k-style'),
    title: 'GunZ: The Duel historical K-Style reference',
    description:
      'An evidence-held introduction to GunZ history and K-Style terminology. It is not a verified modern training or gameplay guide.',
    scope:
      'This route is retained while historical mechanics and any current-release context are reviewed. Detailed movement inputs, frame claims, and weapon guidance remain private until they are source-checked.',
    game: 'GunZ: The Duel',
    gameKey: 'gunz',
    coverAsset: PUBLIC_GAME_SCENE_PATHS.gunz,
    gameVersion: 'Legacy mechanics; current-release context requires review',
    platforms: ['Windows'],
    guideStatus: 'active',
    confidence: 'low',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-01-20',
      nextReviewAt: '2026-07-15',
      reviewCadenceDays: 180,
      reason: 'The prior guide requires a human historical-mechanics and current-release review before publication.',
    },
    sources: [
      {
        title: 'GunZ: The Duel official site',
        publisher: 'Masangsoft',
        url: 'https://gz.masanggames.com/',
        checkedAt: '2026-07-15',
        type: 'official',
      },
      {
        title: 'GunZ: The Duel on Steam',
        publisher: 'Steam / Masangsoft',
        url: 'https://store.steampowered.com/app/3139440/GunZ_The_Duel/',
        checkedAt: '2026-08-03',
        type: 'official',
      },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    route: noIndex('marvel-rivals-complete-hero-guide-tier-list'),
    title: 'Marvel Rivals evidence-held guide',
    description:
      'A patch-pinned guide route retained for review. It does not currently publish a hero database, tier list, team-up table, or balance recommendation.',
    scope:
      'The earlier guide referenced Season 9 and a July 2026 balance baseline. That material is due for review and remains unavailable here until every current claim is verified from primary sources.',
    game: 'Marvel Rivals',
    gameKey: 'marvel-rivals',
    coverAsset: PUBLIC_GAME_SCENE_PATHS['marvel-rivals'],
    gameVersion: 'Season 9 / July 2026 baseline under review',
    platforms: ['Windows', 'PlayStation 4', 'PlayStation 5', 'Xbox Series X|S'],
    guideStatus: 'active',
    confidence: 'medium',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-07-15',
      nextReviewAt: '2026-07-22',
      reviewCadenceDays: 7,
      reason: 'Patch-sensitive hero, team-up, and tier guidance must be re-verified before it can be indexed or republished.',
    },
    sources: [
      {
        title: 'Marvel Rivals Season 9 patch notes',
        publisher: 'NetEase Games / Marvel Games',
        url: 'https://www.marvelrivals.com/20260708/41525_1306959.html',
        checkedAt: '2026-07-15',
        type: 'patch-notes',
      },
      {
        title: 'Marvel Rivals July 2026 balance post',
        publisher: 'NetEase Games / Marvel Games',
        url: 'https://www.marvelrivals.com/balancepost/20260711/41667_1307328.html',
        checkedAt: '2026-07-15',
        type: 'patch-notes',
      },
      {
        title: 'Marvel Rivals official hero directory',
        publisher: 'NetEase Games / Marvel Games',
        url: 'https://www.marvelrivals.com/heroes/index.html',
        checkedAt: '2026-07-15',
        type: 'official',
      },
      {
        title: 'Marvel Rivals official Team-Up directory',
        publisher: 'NetEase Games / Marvel Games',
        url: 'https://www.marvelrivals.com/heroes/teamup.html',
        checkedAt: '2026-07-15',
        type: 'official',
      },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
] as const satisfies readonly PublicMegaGuide[];

/**
 * The former Bloodline Champions reference deliberately remains a compact
 * notice. The private archive retains the research body and its media while
 * primary historical evidence is gathered.
 */
export const PUBLIC_EVIDENCE_HOLDS = [
  {
    kind: 'evidence-hold',
    route: noIndex('bloodline-champions-complete-guide-every-bloodline'),
    title: 'Bloodline Champions historical reference: evidence reconstruction',
    description:
      'A historical-reference route retained while its detailed claims are reconstructed from primary evidence.',
    notice:
      'This page does not publish legacy ability values, roster details, build advice, or competitive-history claims. Those materials remain private until source-captured verification is complete.',
    game: 'Bloodline Champions',
    gameKey: 'bloodline-champions',
    coverAsset: PUBLIC_GAME_SCENE_PATHS['bloodline-champions'],
    sources: [
      {
        title: 'Bloodline Champions on Steam',
        publisher: 'Stunlock Studios / Valve',
        url: 'https://store.steampowered.com/app/6370/Bloodline_Champions/',
        checkedAt: '2026-08-03',
        type: 'official',
      },
      {
        title: 'Bloodline Champions news and patch archive',
        publisher: 'Stunlock Studios / Valve',
        url: 'https://steamcommunity.com/app/6370/allnews/',
        checkedAt: '2026-08-03',
        type: 'patch-notes',
      },
      {
        title: 'The story of Battlerite',
        publisher: 'Stunlock Studios',
        url: 'https://blog.stunlock.com/fr/battlerite-4th-anniversary/',
        checkedAt: '2026-08-03',
        type: 'developer',
      },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
] as const satisfies readonly EvidenceHoldNotice[];

export const PUBLIC_CONTENT = [
  ...PUBLIC_MEGA_GUIDES,
  ...PUBLIC_EVIDENCE_HOLDS,
] as const satisfies readonly PublicContentEntry[];

export function findPublicContentBySlug(slug: string): PublicContentEntry | undefined {
  return PUBLIC_CONTENT.find((entry) => entry.route.slug === slug);
}

/** The first public release intentionally has no indexable editorial entries. */
export const INDEXABLE_PUBLIC_CONTENT: readonly PublicContentEntry[] = [];
