# Coding Standards & Tooling: LLM Arena

This document defines the engineering standards, architectural conventions, design constraints, and tooling workflows for the LLM Arena codebase.

---

## 1. Core Architecture & Paradigms

- **Feature-Centric Structure & Boundaries**:
  - Organize domain code by feature. One feature must never import another feature's private files.
  - Domain-agnostic primitives (shadcn UI kit) land in `infrastructure/ui-kit/`, which is where `components.json` points. Primitives own no domain and are shared across everything.
- **Pure Rules vs. Network Call Split**:
  - When a module needs both pure domain rules and I/O (network requests), split it in two:
    - `infrastructure/<module>.ts`: pure types, limits, schemas, parsing, and formatting with no I/O (safe for client bundle).
    - `infrastructure/fetch-<module>.ts`: `server-only` module that performs the actual network fetching/I/O.
- **Pure Functions & Immutability**:
  - Prefer pure, deterministic functions without shared mutable state.
  - Declare variables with `const` and immutable structures (`readonly`, `ReadonlyArray`).
  - Use functional array methods (`map`, `filter`, `reduce`, `flatMap`) over mutating loops.
  - Push all side-effects (database queries, network requests, storage access) to the outer edges (Next.js route handlers, server actions, or explicit provider layers).
- **Singletons for Infrastructure**: Core clients (Prisma ORM, Arcjet security guard, PostHog telemetry, OpenRouter AI SDK provider) are initialized as singletons in `lib/` or `infrastructure/` to prevent duplicate connection pools and memory leaks in serverless/hot-reload environments.

---

## 2. TypeScript & Type Safety

- **Strict Mode**: `strict: true` is strictly enforced. `any` is strictly prohibited. Use explicit interfaces, generics, or `unknown` with type narrowing.
- **Runtime Schema Validation with Zod**:
  - All external data entering the application—environment variables, HTTP request bodies, query parameters, webhook payloads, and third-party API outputs—must be validated with Zod schemas.
  - Fail fast at startup for environment variables (`lib/env.ts`) so configuration errors are caught before runtime requests.
- **No Type Assertions Without Guards**: Avoid `as SomeType` force-casting unless interfacing with un-typed third-party libraries where type guards are impractical.

---

## 3. UI, Design Tokens & Styling

- **Color Palette & Theme**:
  - **Background**: Warm coffee or dark brown tone (e.g. warm dark earth/espresso), never cold neutral gray (`#111827`) or true black (`#000000`).
  - **Accent Color**: **Rust**. Used strictly and exclusively for interactive elements: buttons, links, active focus rings, selection indicators, and the win-rate bar.
  - **Prohibited Accents**: Blue, indigo, and purple are never used as accents under any circumstances.
  - **Semantic Indicators**:
    - **Green**: Reserved solely for marking a winning model or successful vote.
    - **Red**: Reserved solely for destructive actions and error states.
- **Accessibility & Contrast Baseline**:
  - High visual contrast that holds up in both dark and light modes.
  - Visible focus outlines on all interactive elements.
  - Full keyboard navigability (Tab, Enter, Escape, Arrow keys).
  - Proper ARIA labels and semantic HTML tags (`<main>`, `<nav>`, `<article>`, `<header>`, `<button>`).
- **DRY Styling**:
  - Repeated UI patterns and CSS tokens live in `globals.css` (as CSS variables / utility classes) or dedicated reusable components (e.g. shadcn primitives).
  - If the same group of utility classes is repeated in 3 or more places, extract it into a dedicated component.

---

## 4. Error Handling & User Experience

- **No Raw Exception Leakage**:
  - Never display raw exceptions, provider stack traces, or cryptic JSON error payloads to users.
  - Translate errors into a clear, plain-language sentence explaining what occurred and offer an actionable recovery step (e.g. "Retry Prompt", "Choose Another Model").
- **Stream Isolation**:
  - In multi-model parallel turns, each model stream operates independently over its own HTTP lifecycle.
  - A failure, timeout, or rate-limit error in one model stream must never cancel, corrupt, or degrade sister streams.

---

## 5. Security & Rate Limiting

- **Boundary Protection with Arcjet**:
  - Ingress endpoints (such as `/api/chat`) must be wrapped with Arcjet security rules: bot detection, prompt injection shields, and rate limiting.
  - Rate limiting is keyed by Clerk `userId` for authenticated requests, ensuring fair multi-model turn usage.
- **Secrets & Environment Variables**:
  - Never commit `.env` or `.env.local` files to version control.
  - Maintain [`.env.example`](file:///Users/joaosmoreira/Documents/Code%20CTK/llm-arena/.env.example) with placeholder values for all required and optional environment keys.

---

## 6. Observability & Telemetry

- **Server-Side Tracing**:
  - AI model calls are wrapped with `@posthog/ai` for automatic tracking of latency, time-to-first-token, token consumption, and cost ($0.0000 for free tier).
  - Model failures and provider timeouts must be logged on the server for operational health tracking.
- **Client-Side Analytics**:
  - Product funnels (prompt submitted → model streamed → vote cast) tracked via `posthog-js`.
  - Client events are synchronized with Clerk user identity once resolved.

---

## 7. Tooling & Git Workflow

### Formatting & Linting

| Tool           | Configuration                                                                                      | Purpose                                        | Command                                     |
| :------------- | :------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :------------------------------------------ |
| **Prettier**   | [`.prettierrc.json`](file:///Users/joaosmoreira/Documents/Code%20CTK/llm-arena/.prettierrc.json)   | Code formatting + Tailwind class sorting       | `pnpm run format` / `pnpm run format:check` |
| **ESLint**     | [`eslint.config.mjs`](file:///Users/joaosmoreira/Documents/Code%20CTK/llm-arena/eslint.config.mjs) | Static analysis & React/Next.js best practices | `pnpm run lint` / `pnpm run lint:fix`       |
| **TypeScript** | [`tsconfig.json`](file:///Users/joaosmoreira/Documents/Code%20CTK/llm-arena/tsconfig.json)         | Type checking across all workspace files       | `pnpm run typecheck`                        |

### Pre-commit Enforcement

- **Husky & lint-staged**: Automatically executes on `git commit`.
- **Fast execution**: Prettier and ESLint `--fix` run strictly on staged files for sub-second commit execution.
- **Full verification**: Run `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build` after completing feature changes before opening pull requests.

### Testing Policy

- No heavy test runners (Vitest, Jest) or browser automation frameworks (Playwright, Cypress) are used in this project.
- Verification is conducted through strict type checking, linting, production builds, and hands-on manual verification in a live browser session or via `curl`.
