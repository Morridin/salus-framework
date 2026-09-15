# Anti-slop provenance

- Source repository: https://github.com/dmmulroy/anti-slop
- Copied from the repository-local `.agents/skills/install-anti-slop/assets/anti-slop` bundle on 2026-09-15.
- Exact upstream commit: unknown. The skill lock identifies the source repository but does not record a source commit. No claim is made that this is the latest upstream revision.
- Installed entry points: `index.ts` and `effect/index.ts` beneath `frontend/tools/oxlint/anti-slop/`.
- Every copied asset was compared byte-for-byte with the local bundle. `SOURCE.sha256` records their checksums; checksums identify bytes but cannot reconstruct a missing merge base.
- No source changes. The nested Stylistic license and provenance are preserved.
- Oxlint and @oxlint/plugins are both pinned to 1.83.0, queried from npm during installation.
- All generic rules and the native accumulating-spread companion are enabled at error severity in `frontend/.oxlintrc.json`. Effect is not a direct dependency, so its optional plugin is not enabled.

## Integration and verification

Run `npm run lint:anti-slop --prefix frontend` for the full audit. It is separate from the existing ESLint/Prettier check pipeline while application findings remain. Vendored sources are excluded from application lint and formatting.

Cleanup was limited to the user's changed TypeScript files: readable spacing, explicit optional category IDs, the already-validated active category ID, and typed category test messages/invalid-import fixtures. A second Oxlint fix, ESLint fix, and Prettier pass produced no further changes. The existing `npm run check --prefix frontend` passed, including all 60 tests.

The audit remains failing: defaults reject geometric `shape` names, unknown-valued input boundaries and runtime type validation, along with findings in unchanged source. These were retained rather than renaming domain concepts, removing validation, or suppressing rules. Broader migration is outside this current-changes cleanup.
