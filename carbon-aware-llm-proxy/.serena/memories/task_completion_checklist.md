# Task Completion Checklist

- Code compiles/workspace builds: run `yarn build` (or per-package build) without errors.
- Type checks clean: run `yarn ts:check`.
- Lint passes: run `yarn lint` (and fix as needed).
- Formatting applied: run `yarn prettier:check` or `yarn format`.
- Manual sanity: For UI changes, run `yarn dev:frontend` and verify interactions; for backend changes, exercise endpoints (e.g., via HTTP client) and check logs.
- Keep changes minimal and localized; update README/docs if prop semantics change.
