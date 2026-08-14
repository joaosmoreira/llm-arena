---
name: frontend-design
description: Frontend design best practices, purposeful color systems, typography hierarchy, responsive layouts, accessibility contrast, and distinctive UI polish.
---

# Frontend Design & UI Excellence

This skill provides guidelines and design rules for crafting distinctive, accessible, and high-fidelity frontends without relying on generic AI defaults.

## Core Design Principles

1. **Distinct Visual Direction**:
   - Establish an intentional, memorable theme before writing UI code.
   - Avoid generic cold grays (`#111827`) or pure black (`#000000`) unless specified.
   - In this project, maintain the **Warm Coffee / Espresso** baseline (`#140f0c` dark, `#faf6f0` light) with **Rust** (`#e05d26` / `#c8521e`) strictly for interactive affordances.

2. **Color Semantics & Economy**:
   - **Primary / Accent (Rust)**: Reserved exclusively for interactive elements (buttons, links, active focus rings, win-rate bars).
   - **Winner (Emerald Green `#2ea043`)**: Reserved strictly for victorious models and positive votes.
   - **Destructive (Terracotta Red `#e5534b`)**: Reserved strictly for error states and destructive actions.
   - **Prohibited**: Blue, indigo, and purple are never used as accents.

3. **Typography & Rhythm**:
   - Primary copy & UI labels in `Geist Sans` with clear weight hierarchy (400 regular, 500 medium, 600 semibold).
   - Speed metrics, latencies, tokens, and model identifiers in `Geist Mono`.
   - Maintain proportional spacing (`gap-2`, `gap-4`, `gap-6`, `p-4`, `p-6`).

4. **Accessibility Baseline**:
   - WCAG AA contrast in both Dark and Light modes.
   - Visible, distinct focus rings on all interactive elements.
   - Full keyboard navigability (`Tab`, `Enter`, `Space`, `Escape`).
   - Semantic HTML elements (`<main>`, `<aside>`, `<header>`, `<nav>`, `<button>`).

5. **Motion & Feedback**:
   - Smooth transitions for hover, focus, voting, and theme switching (`transition-colors duration-200`).
   - Skeletons and pulse animations for streaming and loading states.
