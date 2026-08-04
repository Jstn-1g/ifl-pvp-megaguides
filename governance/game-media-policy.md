# Game media release policy

IFL PvP MegaGuides preserves a private recovery archive, but possession of an image is not permission to republish it. Publisher artwork, screenshots, portraits, ability icons, logos, and footage are denied by default.

## Promotion contract

An exact game-media file may enter the public repository only when its record in `public-asset-allowlist.json` includes all of the following:

- a stable game key and exact SHA-256 digest;
- an HTTPS primary-source locator;
- the public-display grant and its scope;
- a separate repository-redistribution grant;
- the required attribution and governing license;
- an affirmative `redistributable` decision; and
- placement under `public/game-media/`.

The MIT license never applies to game media. A public-display grant alone is not enough to put a file in Git, and a press-kit download link is not treated as a license.

## Runtime behavior

Every page must remain complete when publisher media is unavailable. Unless an exact publisher asset is approved, the interface may render only an allowlisted first-party treatment with an honest label such as “Original IFL art · not game footage.” It must never emit an `<img>` with a missing or blocked source.

The release gate checks both sides of this contract:

1. the public-boundary checker refuses unlisted or incompletely licensed media;
2. the built-output checker resolves every local image, responsive source, poster, preload, social image, and CSS URL;
3. browser media QA opens every generated route on desktop and mobile and rejects failed or undecodable media.

## Private archive

Recovery assets remain outside the public repository and production document root until promoted under the exact contract above. Private preservation is not publication and does not change an asset's rights status.
