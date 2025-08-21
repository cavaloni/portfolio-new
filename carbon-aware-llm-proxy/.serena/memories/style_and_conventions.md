# Style and Conventions

- Language: TypeScript across frontend and backend.
- Frameworks: Next.js (App Router) on frontend; Express on backend.
- Styling: Tailwind CSS with `cn` utility; prefer utility classes, consistent variants.
- Types: Prefer explicit interfaces/types; shared types live per-package. Zod used for runtime validation.
- Components: Functional React components; collocate `*.types.ts`, `*.utils.ts` with component.
- Linting: ESLint configured per workspace (`eslint-config-next` on frontend); run `yarn lint`.
- Formatting: Prettier with Tailwind plugin on frontend; run `yarn format` or `yarn prettier:fix`.
- Testing: Backend uses Jest; no explicit frontend tests observed.
- Monorepo: Use Yarn workspaces scripts; avoid cross-package import paths that break workspace constraints.
