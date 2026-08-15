# Scope: LLM Arena

Send one prompt, watch up to three AI models answer it at the same time, and vote for the best one. Over time those votes and the real per-call numbers, speed, tokens, cost, build an honest leaderboard of which model is actually worth using.

Build it in a thin, working slice first, one prompt actually reaching a model and coming back, before making any single part of it fuller. Then thicken it piece by piece. Before building anything, decide what you're doing and why in a few plain sentences, then build it, and if the plan turns out wrong once it's actually built, say so and fix the plan too, not just the code.

Whenever a "build it" style step actually gets underway, break it into its own short list of what's genuinely being done, and check each part off as it's finished, right in this file. That way this file can be opened fresh, in a brand new conversation, and it's obvious what's already done and what's still left, without anyone re-explaining the feature from scratch.

## Stack

Already decided, nothing open here: Next.js (App Router), TypeScript, Tailwind, shadcn for components (card, button, popover, loading skeleton, and whatever else the UI actually needs as it gets built), Prisma with Postgres, Clerk for auth, Arcjet in front of the endpoint, PostHog for analytics and observability.

## Sketches

There are rough hand-drawn sketches for the arena screen, the leaderboard, and the models page. Treat them as structure only, where things sit, what exists on the page, not as the final design or the actual colors, all of that is already decided elsewhere in this file. If something in a sketch genuinely contradicts what's written here, stop and ask which one actually wins rather than guessing.

## At a glance

| #   | Feature                                     | Phase      | Status      |
| --- | ------------------------------------------- | ---------- | ----------- |
| 1   | Connecting to a model                       | Foundation | done        |
| 2   | Coding standards & tooling                  | Foundation | done        |
| 3   | Data model                                  | Foundation | done        |
| 4   | Design & look                               | Foundation | done        |
| 5   | Model picker                                | Slice 1    | done        |
| 6   | Send a prompt, parallel streams, and voting | Slice 1    | done        |
| 7   | App shell & thread history                  | Slice 2    | done        |
| 8   | Public thread visibility & sharing          | Slice 3    | not started |
| 9   | Leaderboard: global & personal              | Slice 4    | not started |

## Foundation

### 1. How the app actually connects to a model

The Next.js project itself gets created manually first, `create-next-app`, fast and simple, no reason to spend agent time or tokens on something that easy.

Two real decisions still open once that exists: how the app calls OpenRouter to get a model's answer, and how streaming three models back to the browser at once should actually work. This one's worth real thought: routing all three through one shared connection looks simpler, but if that one connection drops, all three answers die together, which breaks the whole point of one model failing never affecting the others. Decide both properly, then wire them, along with Prisma, Clerk, and Arcjet, into the project that already exists.

PostHog should be wired in from the start too, session replay and heatmaps turned on, and tied to the signed-in user once Clerk resolves, so events are attached to a real person, not left anonymous.

- [x] Decide the approach
- [x] Write the spec
- [x] Install & configure core packages (`ai`, `@openrouter/ai-sdk-provider`, `@posthog/ai`, `posthog-js`, `@arcjet/next`, `@clerk/nextjs`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `zod`)
- [x] Configure fail-fast environment schema & validation (`lib/env.ts`, `.env.example`)
- [x] Initialize Prisma singleton with PostgreSQL driver adapter (`lib/prisma.ts`)
- [x] Setup Arcjet security guard with token bucket rate limiting, bot protection, and attack shield (`lib/arcjet.ts`)
- [x] Configure OpenRouter AI SDK provider and PostHog server tracing wrapper (`lib/ai/openrouter.ts`)
- [x] Setup PostHog client provider with Clerk authentication sync and session replay (`providers/posthog-provider.tsx`)
- [x] Create Next.js middleware for Clerk auth routing (`middleware.ts`)
- [x] Implement `/api/chat` route with Arcjet protection, isolated streaming, and human error formatting (`app/api/chat/route.ts`)
- [x] Typecheck, lint, production build all clean (`tsc`, `eslint`, `next build` passing with 0 errors)
- [x] Apply the first Prisma migration against the real database (`pooled.db.prisma.io:5432`)
- [x] Confirm a real prompt reaches a real model and returns valid output (`nvidia/nemotron-3.5-lightning:free`)
- [x] Confirm Clerk auth gate and Arcjet rules behave (HTTP 401 gate before Arcjet call)
- [x] Confirm PostHog receives events and client provider initializes
- [x] Update scope.md with verified results

#### Spec: Model Connection & Core Foundation

- **Provider & SDK**: Vercel AI SDK (`ai`) with `@openrouter/ai-sdk-provider` for model inference, streaming responses, abort signals, and usage metadata.
- **Streaming Architecture**: 3 independent parallel HTTP POST requests to `/api/chat` from the client. Each card operates its own stream lifecycle; failures or timeouts in one model stream do not affect others.
- **Speed Metrics & Throughput**: Wall-clock throughput calculated as `outputTokens / (finishTime - requestStartTime)` in seconds. Directly comparable across streaming and buffering models; TTFT (Time to First Token) is tracked and presented as an independent metric alongside it.
- **Observability**: `@posthog/ai` wrapper on server-side AI SDK provider for automatic per-call token, cost ($0.0000 free-tier), and latency tracking. Client-side `posthog-js` with session replay and heatmaps tied to Clerk `userId`.
- **Security & Gatekeeping**: Arcjet middleware/guard on `/api/chat` enforcing rate limits, bot detection, and prompt injection shield.
- **Auth & Database**: `@clerk/nextjs` for user identity and auth middleware; Prisma ORM singleton connected to PostgreSQL.
- **Route Gating Correction**: `/api/chat` requires sign-in (HTTP 401 if unauthenticated) so Arcjet's token bucket is keyed by honest Clerk `userId` (preventing multi-model turn abuse), while feature 8 retains ownership of public thread reading and shareable URLs.

### 2. Coding standards & tooling

Write down the real conventions for this project once it actually exists, then install linting, formatting, and a pre-commit hook that actually enforces them.

- [x] Decide the approach
- [x] Install Prettier (`prettier`, `prettier-plugin-tailwindcss`), configure `.prettierrc.json` and `.prettierignore`
- [x] Configure fast sub-second pre-commit hook with Husky and `lint-staged` (`.lintstagedrc.json`, `.husky/pre-commit`)
- [x] Add developer scripts (`format`, `format:check`, `lint`, `lint:fix`, `typecheck`) to `package.json`
- [x] Write comprehensive standards document in `docs/coding-standards.md`
- [x] Verify formatting, linting, typechecking, and production build

#### Spec: Coding Standards & Tooling

- **Formatting**: Prettier with Tailwind CSS plugin for automated code formatting and class ordering.
- **Linting**: ESLint with Next.js core web vitals and TypeScript rules.
- **Git Hooks**: Husky running `lint-staged` on staged files only (Prettier + ESLint fix) for instant commits without blocking developers.
- **Documentation**: `docs/coding-standards.md` defines feature architecture, immutability, strict TypeScript with Zod schemas, color tokens (warm coffee baseline, rust interactive accent only), error masking, and observability.

### 3. Data model

The core things every feature depends on: users tied to Clerk, threads, each model's own messages inside a thread, and votes. A vote should only ever be possible on a turn where two or more models actually answered.

- [x] Decide the approach
- [x] Write schema in `prisma/schema.prisma` (`User`, `Thread`, `Turn`, `ModelResponse`, `Vote`)
- [x] Push/migrate schema to PostgreSQL database
- [x] Generate typed Prisma client (`app/generated/prisma`)
- [x] Create domain repository/helpers and Zod schemas (`lib/db/`)
- [x] Test database operations with mock end-to-end flow (user, thread, turn, model responses, vote)
- [x] Verify lint, typecheck, and build pass cleanly

#### Spec: Data Model

- **Entities**:
  - `User`: Tied to Clerk `clerkId`, cascades deletes to owned threads and votes.
  - `Thread`: Stores `userId`, `title`, timestamps, and relation to `Turn[]`.
  - `Turn`: Conversational turn (`threadId`, `prompt`, `createdAt`), indexed on `[threadId, createdAt]`.
  - `ModelResponse`: Stores independent model answer per turn with captured metrics (`timeToFirstTokenMs`, `tokensPerSecond`, `inputTokens`, `outputTokens`, `totalTokens`, `costUsd`, `status`, `errorMessage`). Unique on `[turnId, modelId]` and indexed on `modelId` for leaderboard queries.
  - `Vote`: Exactly 1 vote per turn (`turnId` unique constraint), tied to `userId` and `modelResponseId`.
- **Integrity**: Full cascade delete (`onDelete: Cascade`) ensures deleting a user or thread cleans up all nested turns, responses, and votes cleanly without orphan records.

### 4. Design & look

A coffee or dark brown background, warm, not neutral gray or true black. One accent color, rust, used only for things you interact with, buttons, links, focus states, the win-rate bar, never as decoration. Because the background and the accent are both warm tones from the same family, the accent has to stay clearly brighter and more saturated than the background, enough that a button never blends into the page behind it, that's a real risk with two warm colors this close and worth checking by eye, not just by the numbers. Blue, indigo, and purple are never the accent, under any circumstance. Green is reserved only for marking a winner, red only for errors, never reused for anything else. Contrast should genuinely hold up in both light and dark mode, not just look fine at a glance.

- [x] Decide the approach
- [x] Configure Tailwind CSS v4 CSS variables & theme in `app/globals.css` (warm coffee `#140f0c` baseline, warm parchment `#faf6f0` light mode, vivid rust `#e05d26` interactive accent)
- [x] Install and configure `next-themes` with zero-hydration-flicker provider (`providers/theme-provider.tsx`)
- [x] Build core UI primitives in `components/ui/` (`Button`, `Card`, `Badge`, `Progress`, `Skeleton`, `ThemeToggle`)
- [x] Set up UI showcase in `app/page.tsx` displaying the multi-model arena cards, live metrics drawer, winner state, and prompt dock
- [x] Verify strict typecheck, linting, formatting, and Next.js production build (`tsc`, `eslint`, `next build`)

#### Spec: Design System & Look

- **Color Tokens**:
  - Dark Mode Background: Warm espresso `#140f0c` with roast card surfaces `#1e1713` and border `#3a2c24`.
  - Light Mode Background: Warm parchment `#faf6f0` with warm white cards `#ffffff` and border `#e6ded4`.
  - Interactive Accent: Vivid Rust (`#e05d26` dark, `#c8521e` light) strictly for buttons, focus rings, active links, and win-rate progress bars. Prohibits blue, indigo, and purple.
  - Semantic Statuses: Emerald Green (`#2ea043`) strictly for winner badges; Terracotta Red (`#e5534b`) strictly for error messages.
- **Typography & Font Stacks**: `Geist Sans` for UI copy; `Geist Mono` for token speeds, latencies, and metrics.
- **Components**: Reusable Tailwind + Radix primitives in `components/ui/` adhering to accessible focus states and dark/light mode parity.

## Slice 1: Core arena loop

### 5. Model picker

An "Add model" popover pulling OpenRouter's live free-tier list, sorted by context window, capped at three models, defaulting to all three selected, with removable chips next to the prompt box. Also render that same catalog as a simple `/models` page, name, context window, and pricing for each one, so anyone can browse the full list without opening the picker.

- [x] Decide the approach
- [x] Fetch live OpenRouter free-tier catalog with row-by-row Zod parsing in `infrastructure/model-catalog.ts`
- [x] Implement provider-diverse default trio selector (highest context per distinct provider)
- [x] Add `/api/chat` security guard verifying `modelId` belongs to free catalog before inference
- [x] Build cached `/api/models` endpoint with 1-hour ISR cache (`app/api/models/route.ts`)
- [x] Implement accessible Radix `Popover` primitive (`components/ui/popover.tsx`)
- [x] Build `ModelPickerPopover` with search, context length formatting (`1M`, `262K`), and 1-3 model caps (`components/arena/model-picker-popover.tsx`)
- [x] Integrate model picker and removable model chips into `PromptDock` (`components/arena/prompt-dock.tsx`)
- [x] Build live `/models` server-rendered catalog page (`app/models/page.tsx`)
- [x] Verify typechecking, formatting, linting, and production build (`tsc`, `eslint`, `next build`)

#### Spec: Model Picker & Models Page

- **Catalog Infrastructure**: Live fetch in `infrastructure/model-catalog.ts` querying `https://openrouter.ai/api/v1/models` (public endpoint, no key). Zod-parsed per row (bad rows dropped without emptying catalog), filtered for `:free` and `$0.00` pricing, sorted by `context_length` descending, and cached at 1 hour (`revalidate: 3600`).
- **Default Trio**: Highest-context model per distinct provider (e.g. Nemotron 3 Ultra [NVIDIA, 1M], Ling-3.0-flash [inclusionAI, 262K], Poolside Laguna S 2.1 [Poolside, 262K]). 100% dynamic without hardcoding.
- **Picker UI**: Radix popover anchored to `+ Add Model` trigger in prompt dock. Shows full list without artificial filtering, formatted context (`1M`, `262K`), cap at 3 models / floor at 1 model, with disabled state explaining itself.
- **Model Chips**: Active models displayed as removable tags above the textarea in the prompt dock.
- **Catalog Page**: Dedicated server-rendered `/models` page displaying full model cards, context window, $0.00 pricing, and provider info.
- **Ingress Security**: `/api/chat` validates `modelId` against `isAllowedFreeModel()` to prevent paid model usage against our server API key.

### 6. Send a prompt, parallel streams, and voting

The heart of the product. One prompt goes to every selected model at once, each streaming and failing independently, so one being slow or down never blocks the others. Each answer shows its own real time-to-first-token, tokens per second, and total tokens. No cost shown, every model here is free tier, so it would always read zero. A vote only exists once two or more models have answered, and picking one writes exactly one vote and marks that answer as the winner, while every answer stays visible the whole time. A follow-up continues each model's own separate conversation.

Arcjet sits in front of this endpoint before any model is ever called: rate limiting, bot protection, and a shield against prompt injection, plus a real limit on how much one person can use across all three models at once, not just a limit on the endpoint overall.

Every prompt sent, every answer finishing, and every vote cast should be tracked as a real PostHog event, so there's an honest funnel from prompt to answer to vote. A model failing should also be logged properly on the server, not just shown to the user and forgotten. Separately from that funnel, every actual model call should also be wrapped so PostHog captures its own real tokens, cost, and latency per call, that's PostHog's own LLM analytics, not the same thing as the funnel events or the numbers already shown on the response card.

- [x] Decide the approach
- [x] Build `/api/threads` route handler (create thread + turn in Postgres from first prompt)
- [x] Build `/api/turns` route handler (create follow-up turn in an existing thread)
- [x] Build `/api/responses` route handler (persist/update completed model response metrics)
- [x] Build `/api/vote` route handler (authenticated vote casting with 2+ response verification)
- [x] Create `useArenaBattle` orchestrator hook for independent parallel streaming, live TTFT/speed math, and error handling
- [x] Update `PromptDock` with locked models in active threads and streaming disabled states
- [x] Update `ResponseCard` with streaming indicators, retry affordance on error, and live metrics drawer
- [x] Wire `/` (empty state) and `/t/[id]` (active thread) to live streaming, follow-ups, and voting
- [x] Wire PostHog client funnel tracking (`prompt_sent`, `model_stream_completed`, `model_stream_failed`, `vote_cast`)
- [x] Verify typecheck, lint, and build pass cleanly

#### Spec: Send Prompt, Parallel Streams, & Voting

- **Thread Initialization Sequence**: When sending a prompt from an empty arena (no active thread), the client first creates the `Thread` and `Turn` on the server, navigates to `/t/[threadId]`, and then initiates the parallel model streams. For follow-ups within an existing thread, the turn is created directly under the current thread.
- **Parallel Streams**: 1–3 independent HTTP requests to `/api/chat` using isolated `AbortController`s. Failures or rate limits on one model never affect sister streams.
- **Metrics Calculation**:
  - Time-to-First-Token (TTFT): ms from stream dispatch to first chunk received.
  - Speed (tokens/sec): calculated as `outputTokens / (finishTime - requestStartTime)`.
  - Total tokens: recorded per completed model response.
- **Multi-Turn Isolation & Model Locking**: Models selected on turn one are locked for the lifetime of the thread. Follow-up prompts in an active thread use the same models (the model picker becomes read-only/hidden), and each model continues its own separate conversation history (`[User -> Model A -> User -> Model A]`). To test different models, a user starts a new arena battle.
- **Voting Enforcement**: Voting is only permitted when 2 or more models have completed responses in that turn. Exactly 1 vote per turn written to PostgreSQL with race-condition safety. Winner is badged in emerald green.
- **Observability & Funnel**: PostHog tracks funnel events (`prompt_sent`, `model_stream_completed`, `model_stream_failed`, `vote_cast`) plus server-side LLM call tracing via `@posthog/ai` (`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` configured for server and client capture).
- **Security & Error Masking**: Ingress protected by Arcjet (token bucket keyed by Clerk `userId`, bot detection, prompt injection shield). Human-readable, non-technical error cards with retry actions.
- **UI State Machine**: Composer automatically swaps to a "Sign in to send" button when signed out; failed models expose "Try again" column recovery; once 2+ columns complete, "Pick this" appears; after voting, only the emerald winner badge displays.

## Slice 2: App shell & thread history

### 7. App shell & thread history

The frame everything else sits inside: a top bar and sidebar that stay in place while the page scrolls, the thread's name, and each model's win record shown right there (shrinking down to a small dot and number if it gets crowded). The sidebar lists a signed-in user's own past threads so the tool actually feels usable across visits, not just in one sitting.

- [x] Decide the approach
- [x] Build sticky AppHeader with breadcrumb, thread title, and responsive shrinking model win record badges
- [x] Build persistent AppSidebar with time-grouped past threads ("Today", "This week", "Earlier") and turn count badges
- [x] Implement mobile drawer overlay with smooth slide-in and backdrop dismiss
- [x] Add active thread indicator and "New Battle" CTA in sidebar
- [x] Configure cache-busting headers for instant thread list freshness on navigation
- [x] Verify typechecking, linting, formatting, and production build

#### Spec: App Shell & Thread History

- **Sticky Top Bar**: `AppHeader` maintains fixed position (`h-14`, border-b, backdrop blur) above the scrollable content. Displays breadcrumb, thread title, and responsive model win pills.
- **Responsive Win Records**: On desktop viewports, displays model letter badge, name, and win ratio (`N Nemotron 2/3`). On crowded/mobile viewports, automatically shrinks to a compact letter/dot and win number (`N: 2`), with full details in tooltip/title, highlighting active winners in emerald green (`#2ea043`).
- **Sidebar & History Grouping**: `AppSidebar` fetches authenticated user's threads from PostgreSQL via `GET /api/threads` (bypassing stale caches). Automatically groups threads chronologically into "Today", "This week", and "Earlier", rendering turn count chips (`2t`) and active thread indicators.
- **Mobile Responsive Drawer**: On small screens, the sidebar functions as an overlay drawer with backdrop blur, closing automatically upon navigation or clicking outside.
- **New Battle & Auth States**: Provides a quick "+ New Battle" button at the top of the history list, with distinct empty states for unauthenticated visitors and new users.

## Slice 3: Public visibility & sharing

### 8. Public thread visibility & sharing

Anyone should be able to open a thread's link and see it, without an account, that's what actually makes it shareable. Only sending a prompt and voting need sign-in. A made-up or deleted thread just shows a plain not-found page either way. The thread's real owner sees everything everyone else sees, plus the ability to actually use it.

- [ ] Decide the approach
- [ ] Build it

## Slice 4: Leaderboard

### 9. Leaderboard: global & personal

Two leaderboards from the same votes, one for everyone, one just for the signed-in user. Each row's win rate is the big, bold number, in the accent color, with a small bar next to it, always written as "won 4 of 5," never a bare percentage or a made-up score. Smaller, quieter numbers underneath for average speed and time-to-first-token, each clearly labeled. No cost or "cheapest" stat, every model is free, so that number never means anything here. First place gets a subtle highlight, nobody else does.

- [ ] Decide the approach
- [ ] Build it

## Not doing right now

Kept here so the plan stays honest about what's deliberately left out.

- A "fastest" label on the leaderboard, tagging whichever model already has the best average speed, only for models with enough votes to mean anything. Nice to have, not required.
- Giving each model's own little icon a distinct look instead of plain gray. Nice to have, not required.
- Privacy policy and terms pages.
- Rich link previews when a thread gets shared somewhere.
- Any kind of admin or moderation page.
- A public API for the leaderboard data. Nobody's asked for this.
