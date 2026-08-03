# Contributing to IFL PvP MegaGuides

Thank you for helping make competitive-game reference material more useful, accurate, accessible, and durable. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md) in every project space.

## What we welcome

- Reproducible site fixes, performance work, accessibility improvements, and tests.
- Documentation and tooling improvements.
- Well-scoped corrections supported by primary sources.

Open an issue before a large design, schema, automation, or content change. Security reports belong in [SECURITY.md](SECURITY.md), and rights concerns belong in [NOTICE.md](NOTICE.md).

## Sign off your work

All human commits must carry the Developer Certificate of Origin sign-off:

```bash
git commit -s -m "fix: describe the change"
```

This adds `Signed-off-by: Your Name <email@example.com>` to the commit. By signing off, you certify the statements in [DCO.md](DCO.md). Do not sign off work that you are not authorized to submit under the stated license.

The exact GitHub Dependabot identity has a narrow CI-only exception so its dependency pull requests can run verification before review. This is not a DCO waiver for `main`: automated dependency pull requests are not approved for merge as-is, and a maintainer must review the update and contribute the accepted change through a signed-off human commit before it can merge. The exception does not waive scope, licensing, rights, or security review.

## AI and automation

AI, models, generators, scrapers, and automation can assist with a contribution, but they cannot establish rights, authorship, factual accuracy, or legal permission. Disclose material assistance in the pull request and describe how a person checked the output. Do not present generated output as independently verified evidence.

## Content, data, and assets

This public codebase is not a contribution channel for unreviewed editorial material, datasets, brand assets, or media. Do not add:

- copied articles, guides, wikis, or publisher text;
- scraped, synchronized, or bulk-collected datasets;
- game art, screenshots, trailers, video, audio, logos, player/team imagery, or third-party fonts;
- personal data, private communications, credentials, access tokens, or unpublished information; or
- a file whose creator, source, and redistribution rights cannot be documented.

Submit a source link or correction proposal instead. A future non-code inclusion requires a maintainer-approved record in the applicable deny-by-default manifest before it may enter public history. See [CONTENT-LICENSE.md](CONTENT-LICENSE.md), [ASSET-GOVERNANCE.md](ASSET-GOVERNANCE.md), and [TRADEMARKS.md](TRADEMARKS.md).

## Pull requests

Keep each pull request focused. Include:

1. the outcome and explicit non-goals;
2. the issue, source, or evidence it addresses;
3. every check run and result;
4. before/after evidence for visible changes, including keyboard, screen-reader, reduced-motion, and responsive checks where relevant;
5. any new dependency, network request, scheduled behavior, permission, or secret requirement; and
6. material AI or automation assistance and your verification method.

Pull requests do not authorize merging, deployment, external posting, or release publication. Maintainers may request narrower scope, more evidence, or removal of material with unclear rights.
