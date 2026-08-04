# Asset and source governance

This public repository is deny-by-default for non-text assets. A public URL, attribution, editorial purpose, or technical ability to download a file is not approval to redistribute it from this repository.

## Launch boundary

The public release contains eleven approved first-party presentation assets: the reserved IFL PvP logo, two project-directed franchise-neutral hero illustrations, five original route illustrations, the social card generated with the logo, and two local-build interface captures recorded in the public asset allowlist. The standalone logo and all seven illustrations remain outside the MIT code license. The genre-world scene, simplified fantasy arena silhouettes, and route scenes are decorative original art—not screenshots, publisher art, game footage, or evidence for any covered game. Publisher game artwork, gameplay screenshots, video, audio, publisher logos, third-party fonts, author portraits, collected source media, and any unreviewed social asset are excluded.

Any future non-text asset must have exactly one approved entry in [governance/public-asset-allowlist.json](governance/public-asset-allowlist.json). The entry must record its exact path, SHA-256 digest, creator or source, rights basis, applicable license or permission, approval date, reviewer, and redistribution status.

## Approval rule

An asset may enter public history only after a maintainer has reviewed the exact file and documented a permission or license that covers repository storage and public redistribution. Attribution alone is not permission. If a license imposes notice, naming, attribution, territory, expiry, or modification conditions, the record must state how those conditions are met.

The public-boundary check fails when an asset is unlisted, has a mismatched digest, is marked anything other than `approved`, or falls outside the narrow approved path. Do not use this repository as a holding area for material awaiting a rights decision.
