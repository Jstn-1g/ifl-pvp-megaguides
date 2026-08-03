# Asset and source governance

This public repository is deny-by-default for non-text assets. A public URL, attribution, editorial purpose, or technical ability to download a file is not approval to redistribute it from this repository.

## Launch boundary

The initial public release contains no approved binary media. Game artwork, screenshots, video, audio, publisher logos, third-party fonts, author portraits, social banners, and collected source media are excluded.

Any future non-text asset must have exactly one approved entry in [governance/public-asset-allowlist.json](governance/public-asset-allowlist.json). The entry must record its exact path, SHA-256 digest, creator or source, rights basis, applicable license or permission, approval date, reviewer, and redistribution status.

## Approval rule

An asset may enter public history only after a maintainer has reviewed the exact file and documented a permission or license that covers repository storage and public redistribution. Attribution alone is not permission. If a license imposes notice, naming, attribution, territory, expiry, or modification conditions, the record must state how those conditions are met.

The public-boundary check fails when an asset is unlisted, has a mismatched digest, is marked anything other than `approved`, or falls outside the narrow approved path. Do not use this repository as a holding area for material awaiting a rights decision.
