# IFL PvP MegaGuides

**Source-backed, version-pinned field manuals for competitive games.**

IFL PvP MegaGuides is a guide-first reference site built for players who want durable answers: what a guide covers, which version it reflects, when it was reviewed, and the evidence behind material claims.

The original application and maintenance tooling in this release candidate are intended for MIT-licensed publication only after the public-release attestation and release checks pass. The project’s editorial library, collected data, brand assets, and third-party material are not automatically covered by that license. Start with [CONTENT-LICENSE.md](CONTENT-LICENSE.md) and [NOTICE.md](NOTICE.md) before reusing anything other than code.

## What is included

- An Astro-based static-site foundation for a guide-first reference experience.
- Deterministic local checks for build quality, accessibility, release boundaries, contributor sign-off, and dependency licensing.
- Synthetic example material and a CSS-led reference-grid visual language—no publisher game art, screenshots, video, collected game data, or legacy editorial archive.
- A human-reviewed maintenance model: automation may prepare proposals, but it may not merge, deploy, or publish without maintainer approval.

The production site remains at [iflpvp.com](https://iflpvp.com). This repository deliberately does not include a live-site export or a copy of its historical media library.

## Repository status

This is a release candidate for a clean public codebase. Its public-release attestation is still a [template](governance/PUBLIC-RELEASE-ATTESTATION.md), not a signed statement. Its custom first-party social preview is generated deterministically from CSS, hash-pinned in the asset allowlist, and contains no prior screenshot or game media.

## Local development

Requirements: Node.js 24 or newer and npm.

```bash
npm ci
npm run dev
```

Before opening a pull request, run the checks relevant to the change:

```bash
npm run public:boundary
npm run policy:dco
npm run licenses:check
npm run check
npm test
npm run build
```

The full release sequence is `npm run release:gate`. It is intentionally fail-closed: passing a normal build is not authorization to publish a release, asset, article, or deployment.

## Contribution rules

Read [CONTRIBUTING.md](CONTRIBUTING.md), [DCO.md](DCO.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) before participating.

- Sign off each human commit with `git commit -s`.
- Disclose material AI or automation assistance and verify its output yourself.
- Submit original, MIT-compatible code only. Do not submit publisher media, copied writing, scraped data, private information, credentials, or assets with unclear rights.
- Use a source link or correction proposal instead of copying protected content.

## Support and contact

Optional support helps cover hosting, source review, accessibility, and preservation. It does not influence rankings, conclusions, corrections, or coverage, and is not a charitable donation or tax-deductible contribution. Current options are listed on the first-party [support page](https://iflpvp.com/support).

For rights concerns, use [NOTICE.md](NOTICE.md). For security vulnerabilities, use [SECURITY.md](SECURITY.md), not a public issue.
