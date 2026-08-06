/**
 * Public guide directory and trust metadata.
 *
 * The detailed bodies live in `src/data/guides/`. They are restored owner-
 * authorized editorial editions with every private/publisher media reference
 * removed. They remain noindex until their factual review is signed off.
 */

import { PUBLIC_GAME_SCENE_PATHS } from '../lib/public-game-scenes.mjs';

export type SourceKind = 'official' | 'developer' | 'patch-notes' | 'community';
export type GameKey = 'battlerite' | 'gigantic' | 'gunz' | 'marvel-rivals' | 'bloodline-champions';

export interface EvidenceSource {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly checkedAt: string;
  readonly type: SourceKind;
}

export interface ReviewRecord {
  readonly state: 'historical-reference' | 'review-due';
  readonly lastReviewedAt: string;
  readonly nextReviewAt: string;
  readonly reviewCadenceDays: number;
  readonly reason: string;
}

export interface PublicRoutePolicy {
  readonly slug: string;
  readonly robots: 'index,follow' | 'noindex,follow';
  readonly indexable: boolean;
}

export interface GuideStats {
  readonly wordCount: number;
  readonly sectionCount: number;
  readonly tableRows: number;
}

export interface GuideRestoration {
  readonly firstPublishedAt: string;
  readonly restoredAt: string;
  readonly bodySha256: string;
  readonly mediaEmbedsRemoved: number;
}

export interface PublicMegaGuide {
  readonly kind: 'mega-guide';
  readonly publicationState: 'historical-reference' | 'patch-snapshot';
  readonly route: PublicRoutePolicy;
  readonly title: string;
  readonly description: string;
  readonly scope: string;
  readonly game: string;
  readonly gameKey: GameKey;
  readonly gameVersion: string;
  readonly platforms: readonly string[];
  readonly guideStatus: 'active' | 'stable';
  readonly confidence: 'low' | 'medium';
  readonly review: ReviewRecord;
  readonly stats: GuideStats;
  readonly restoration: GuideRestoration;
  readonly sources: readonly EvidenceSource[];
  readonly coverAsset: string;
  readonly visual: 'original-ifl-illustration';
  readonly contentRights: 'editorial-text-reserved';
}

const heldRoute = (slug: string): PublicRoutePolicy => ({
  slug,
  robots: 'noindex,follow',
  indexable: false,
});

export const PUBLIC_MEGA_GUIDES = [
  {
    kind: 'mega-guide',
    publicationState: 'historical-reference',
    route: heldRoute('battlerite-complete-guide-every-champion'),
    title: 'Battlerite Complete Champion & Arena Reference',
    description: 'A detailed historical reference to Battlerite’s final content era, including arena systems, roles, champions, abilities, strategy, and legacy.',
    scope: 'Restores the full authored final-era Battlerite reference. It documents historical mechanics and all 27 champion sections; it is not live population, queue-health, or current-meta advice.',
    game: 'Battlerite',
    gameKey: 'battlerite',
    coverAsset: PUBLIC_GAME_SCENE_PATHS.battlerite,
    gameVersion: 'Final content build 2.3.0 (October 2019)',
    platforms: ['Windows'],
    guideStatus: 'stable',
    confidence: 'medium',
    review: {
      state: 'historical-reference',
      lastReviewedAt: '2026-07-15',
      nextReviewAt: '2026-10-13',
      reviewCadenceDays: 90,
      reason: 'Historical values are restored with their edition label; claim-level primary-source review continues before indexing.',
    },
    stats: { wordCount: 9143, sectionCount: 46, tableRows: 267 },
    restoration: {
      firstPublishedAt: '2026-03-15',
      restoredAt: '2026-08-05',
      bodySha256: 'c7bac8c65dc95d84cb71b097a926560c39dd6be035e4ae83397e9cbf4ce079b2',
      mediaEmbedsRemoved: 216,
    },
    sources: [
      { title: 'Battlerite on Steam', publisher: 'Stunlock Studios / Valve', url: 'https://store.steampowered.com/app/504370/Battlerite/', checkedAt: '2026-08-03', type: 'official' },
      { title: 'The Future of Battlerite', publisher: 'Stunlock Studios', url: 'https://blog.stunlock.com/the-future-of-battlerite/', checkedAt: '2026-08-03', type: 'developer' },
      { title: 'Battlerite Patch 2.3.0 / Royale Patch 1.3.0', publisher: 'Stunlock Studios', url: 'https://blog.stunlock.com/october-update/', checkedAt: '2026-08-03', type: 'patch-notes' },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    publicationState: 'historical-reference',
    route: heldRoute('bloodline-champions-complete-guide-every-bloodline'),
    title: 'Bloodline Champions Systems & Bloodline Archive',
    description: 'A detailed community-reconstructed historical reference covering Bloodline Champions systems, 27 bloodlines, abilities, game modes, competitive history, and legacy.',
    scope: 'Restores the full authored research body as a clearly labeled historical reconstruction. Exact values can vary by retained build and are not presented as verified current service guidance.',
    game: 'Bloodline Champions',
    gameKey: 'bloodline-champions',
    coverAsset: PUBLIC_GAME_SCENE_PATHS['bloodline-champions'],
    gameVersion: 'Historical patch baseline not yet established',
    platforms: ['Windows'],
    guideStatus: 'stable',
    confidence: 'low',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-08-03',
      nextReviewAt: '2026-11-01',
      reviewCadenceDays: 90,
      reason: 'This community reconstruction is useful historical material, but exact values still need a source-captured build baseline.',
    },
    stats: { wordCount: 10247, sectionCount: 48, tableRows: 273 },
    restoration: {
      firstPublishedAt: '2026-03-15',
      restoredAt: '2026-08-05',
      bodySha256: 'c2e8c9fa6452afb8cdb370a25fe0ed77b1cd2b24dae3e716d36d0d267b302c60',
      mediaEmbedsRemoved: 220,
    },
    sources: [
      { title: 'Bloodline Champions on Steam', publisher: 'Stunlock Studios / Valve', url: 'https://store.steampowered.com/app/6370/Bloodline_Champions/', checkedAt: '2026-08-03', type: 'official' },
      { title: 'Bloodline Champions news and patch archive', publisher: 'Stunlock Studios / Valve', url: 'https://steamcommunity.com/app/6370/allnews/', checkedAt: '2026-08-03', type: 'patch-notes' },
      { title: 'The Story of Battlerite', publisher: 'Stunlock Studios', url: 'https://blog.stunlock.com/fr/battlerite-4th-anniversary/', checkedAt: '2026-08-03', type: 'developer' },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    publicationState: 'historical-reference',
    route: heldRoute('gigantic-complete-guide-every-hero'),
    title: 'Gigantic 21-Hero Legacy Reference',
    description: 'A detailed legacy reference for Gigantic’s original 21-hero subset, including objectives, stamina, creatures, roles, builds, matchups, and team composition.',
    scope: 'Restores the complete authored legacy subset. It does not claim to cover the full current Rampage Edition roster or current balance.',
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
      nextReviewAt: '2026-05-06',
      reviewCadenceDays: 90,
      reason: 'Legacy strategy and values are visible again, but Rampage Edition parity is intentionally unclaimed.',
    },
    stats: { wordCount: 11219, sectionCount: 45, tableRows: 116 },
    restoration: {
      firstPublishedAt: '2026-02-05',
      restoredAt: '2026-08-05',
      bodySha256: 'db7ce5cdcd177a53bf7d0116a8c833936040fc0bbdac3ee7b7a8a72251e9a62d',
      mediaEmbedsRemoved: 126,
    },
    sources: [
      { title: 'Gigantic: Rampage Edition on Steam', publisher: 'Arc Games / Valve', url: 'https://store.steampowered.com/app/1924490/Gigantic_Rampage_Edition/', checkedAt: '2026-07-15', type: 'official' },
      { title: 'Gigantic official site', publisher: 'Arc Games', url: 'https://www.gogigantic.com/en/', checkedAt: '2026-07-15', type: 'official' },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    publicationState: 'historical-reference',
    route: heldRoute('gunz-the-duel-complete-guide-k-style'),
    title: 'GunZ: The Duel K-Style History & Technique Reference',
    description: 'A detailed historical guide to GunZ movement, K-Style, D-Style, E-Style, weapons, training progression, terminology, and competitive legacy.',
    scope: 'Restores the authored mechanics and technique reference while separating legacy play knowledge from current service, private-server, and modern-balance claims.',
    game: 'GunZ: The Duel',
    gameKey: 'gunz',
    coverAsset: PUBLIC_GAME_SCENE_PATHS.gunz,
    gameVersion: 'Legacy mechanics reference; current-release context under review',
    platforms: ['Windows'],
    guideStatus: 'stable',
    confidence: 'low',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-01-20',
      nextReviewAt: '2026-07-19',
      reviewCadenceDays: 180,
      reason: 'Technique history is restored; exact current service, balance, and population claims remain outside the edition.',
    },
    stats: { wordCount: 4614, sectionCount: 39, tableRows: 94 },
    restoration: {
      firstPublishedAt: '2026-01-20',
      restoredAt: '2026-08-05',
      bodySha256: '70773fb2be836e76d227b105c5cb603759379c2921abbb933812d9ba66b42feb',
      mediaEmbedsRemoved: 16,
    },
    sources: [
      { title: 'GunZ: The Duel official site', publisher: 'Masangsoft', url: 'https://gz.masanggames.com/', checkedAt: '2026-07-15', type: 'official' },
      { title: 'GunZ: The Duel on Steam', publisher: 'Steam / Masangsoft', url: 'https://store.steampowered.com/app/3139440/GunZ_The_Duel/', checkedAt: '2026-08-03', type: 'official' },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
  {
    kind: 'mega-guide',
    publicationState: 'patch-snapshot',
    route: heldRoute('marvel-rivals-complete-hero-guide-tier-list'),
    title: 'Marvel Rivals Season 9 Roles, Team-Ups & Meta Reference',
    description: 'A detailed July 2026 Season 9 snapshot covering roles, Team-Ups, roster context, balance changes, composition patterns, and a visibly dated early-meta tier analysis.',
    scope: 'Restores the full authored Season 9 snapshot. The patch line is visible throughout; rankings and volatile hero guidance are historical analysis pending the next official update review.',
    game: 'Marvel Rivals',
    gameKey: 'marvel-rivals',
    coverAsset: PUBLIC_GAME_SCENE_PATHS['marvel-rivals'],
    gameVersion: 'Season 9 / 20260710 launch update + 20260711 emergency balance post',
    platforms: ['Windows', 'PlayStation 4', 'PlayStation 5', 'Xbox Series X|S'],
    guideStatus: 'active',
    confidence: 'medium',
    review: {
      state: 'review-due',
      lastReviewedAt: '2026-07-15',
      nextReviewAt: '2026-07-22',
      reviewCadenceDays: 7,
      reason: 'The detailed Season 9 snapshot is available, but live-service rankings and Team-Up values require a fresh patch review before indexing.',
    },
    stats: { wordCount: 5473, sectionCount: 32, tableRows: 173 },
    restoration: {
      firstPublishedAt: '2026-07-15',
      restoredAt: '2026-08-05',
      bodySha256: 'e44a6b7833828c4648c0cb2d9307e0d4f2f60aaabf81bb1ec9a8e4097f69d60d',
      mediaEmbedsRemoved: 0,
    },
    sources: [
      { title: 'Marvel Rivals Season 9 patch notes', publisher: 'NetEase Games / Marvel Games', url: 'https://www.marvelrivals.com/20260708/41525_1306959.html', checkedAt: '2026-07-15', type: 'patch-notes' },
      { title: 'Marvel Rivals July 2026 balance post', publisher: 'NetEase Games / Marvel Games', url: 'https://www.marvelrivals.com/balancepost/20260711/41667_1307328.html', checkedAt: '2026-07-15', type: 'patch-notes' },
      { title: 'Marvel Rivals official hero directory', publisher: 'NetEase Games / Marvel Games', url: 'https://www.marvelrivals.com/heroes/index.html', checkedAt: '2026-07-15', type: 'official' },
      { title: 'Marvel Rivals official Team-Up directory', publisher: 'NetEase Games / Marvel Games', url: 'https://www.marvelrivals.com/heroes/teamup.html', checkedAt: '2026-07-15', type: 'official' },
      { title: 'Marvel Rivals official release FAQ', publisher: 'NetEase Games / Marvel Games', url: 'https://www.marvelrivals.com/news/20241205/40185_1198415.html', checkedAt: '2026-07-15', type: 'official' },
      { title: 'Counterwatch Season 9 tier context', publisher: 'Counterwatch', url: 'https://www.counterwatch.gg/stats/marvel-rivals/tier-list', checkedAt: '2026-07-15', type: 'community' },
      { title: 'RivalsMeta Season 9 tier context', publisher: 'RivalsMeta', url: 'https://rivalsmeta.com/tier-list/', checkedAt: '2026-07-15', type: 'community' },
    ],
    visual: 'original-ifl-illustration',
    contentRights: 'editorial-text-reserved',
  },
] as const satisfies readonly PublicMegaGuide[];

export type PublicContentEntry = (typeof PUBLIC_MEGA_GUIDES)[number];
export const PUBLIC_CONTENT = PUBLIC_MEGA_GUIDES;

export function findPublicContentBySlug(slug: string): PublicContentEntry | undefined {
  return PUBLIC_CONTENT.find((entry) => entry.route.slug === slug);
}

export const INDEXABLE_PUBLIC_CONTENT = PUBLIC_CONTENT.filter((entry) => entry.route.indexable);
