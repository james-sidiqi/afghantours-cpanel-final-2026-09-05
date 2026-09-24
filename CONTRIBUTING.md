# Contributing to AfghanTours

## Design-system rules

AfghanTours uses a shared visual system defined in `src/styles/tokens.css` and demonstrated at `/design-system/` during development.

1. **Reuse before creating.** Reuse an existing shared component or design token before creating a page-specific equivalent.
2. **No ad-hoc design values.** Do not introduce a new hex color, font family, font size, font weight, border radius, spacing value, shadow, motion value, or content width when an existing AfghanTours token can satisfy the requirement. New tokens must represent a genuine reusable design requirement rather than a page-specific exception.
3. **Public language stays public-facing.** Public pages must not expose internal IDs, implementation language, TODOs, staff-only operational notes, development terminology, or database labels.
4. **Typography.** Georgia is the display typeface and uses 400/700 only. Body/UI copy uses the system sans-serif stack. Do not add synthetic 800/900/950 Georgia weights.
5. **Canonical content.** One subject should have one canonical public page. Other pages should link to it rather than create competing versions.
6. **Responsive QA.** Shared patterns must be checked on desktop, tablet, and mobile before merging.
7. **Accessibility.** Maintain visible focus states, useful alternative text, readable contrast, semantic headings, and `prefers-reduced-motion` behavior.

## Public vs internal tools

Internal planning tools must not appear in public navigation and should use `noindex,nofollow` unless they are deliberately promoted to a traveler-facing product.
