# Public governance records

These records define the public repository boundary. They are deliberately deny-by-default:

- `public-asset-allowlist.json` contains only exact, hash-pinned non-text assets with a documented redistribution basis.
- `content-rights-manifest.json` contains only exact, hash-pinned non-code material with a documented inclusion basis.
- `dependency-licenses.json` records every direct production and development dependency reviewed for this candidate.
- `PUBLIC-RELEASE-ATTESTATION.md` is a template and has not been signed.

The release gate must verify these records rather than treating their presence as approval.
