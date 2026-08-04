# Public content boundary

`public-content.ts` is the entire editorial-data boundary for the initial public
release. It contains five newly authored, publisher-image-free route records:
four review-due MegaGuide summaries and one Bloodline Champions
evidence-reconstruction notice.

## Intentional omissions

No legacy route manifest is included in this public repository. The private archive
contains 92 additional published legacy articles and two drafts. The 92 legacy
articles do not have source metadata, and copying even slug/title pairs into
the public repository would create an incomplete catalogue that could be
mistaken for public, reviewed content.

The public site should therefore expose only a general archive-status page
until an individual legacy article is independently reviewed and intentionally
restored. When a route returns, preserve its established slug and record:

- an ownership/right-to-publish attestation for the editorial text;
- primary sources for material factual claims, each with a checked date;
- a current or clearly historical scope statement;
- `robots` status appropriate to its review state; and
- publisher-image-free body and metadata, unless an exact asset has a documented
  public-rights basis.

The public release deliberately excludes the former article bodies, frontmatter
image paths, Markdown image embeds, social/OG media, videos, author portrait,
font binaries, game logos, hero data, ability data, and all scraped or
synchronized datasets. Those materials remain in the private source
archive pending separate rights and evidence review.

The shared fantasy arena presentation is original, hash-pinned project art. It
is decorative, is not tied to any covered game, and is never guide evidence.

## Route state

All five retained routes use `noindex,follow`. This preserves a stable path for
existing links while preventing the evidence-held summary from entering a
sitemap, RSS feed, or search index. A route becomes indexable only after a
human review updates its factual content and evidence.
