# OrbitX Design System — Style Guide

## Design Direction

Clean, calm, professional. Inspired by Linear, Notion, Vercel.
Whitespace is a feature. Every element earns its place.

---

## Colors

### Neutral Scale (cool gray)

| Token | Hex | Usage |
|---|---|---|
| `neutral-50` | `#F9FAFB` | Lightest backgrounds, hover states |
| `neutral-100` | `#F3F4F6` | Secondary backgrounds, alternating rows |
| `neutral-200` | `#E5E7EB` | Borders, dividers |
| `neutral-300` | `#D1D5DB` | Disabled borders, subtle dividers |
| `neutral-400` | `#9CA3AF` | Placeholder text, disabled text |
| `neutral-500` | `#6B7280` | Secondary text, labels |
| `neutral-600` | `#4B5563` | Body text (alt), strong secondary |
| `neutral-700` | `#374151` | Headings (alt), emphasis |
| `neutral-800` | `#1F2937` | Strong headings |
| `neutral-900` | `#111827` | Primary text, maximum contrast |

### Primary Scale (indigo)

| Token | Hex | Usage |
|---|---|---|
| `primary-50` | `#EEF2FF` | Primary tint backgrounds |
| `primary-100` | `#E0E7FF` | Selected row backgrounds, active tabs |
| `primary-200` | `#C7D2FE` | Focus ring (light weight) |
| `primary-300` | `#A5B4FC` | Active/selected borders |
| `primary-400` | `#818CF8` | Dark-mode accent text |
| `primary-500` | `#6366F1` | Default accent, links, badges |
| `primary-600` | `#4F46E5` | Primary buttons, active states |
| `primary-700` | `#4338CA` | Primary button hover |

### Semantic Surface Tokens (swap in dark mode)

| Token | Light | Dark | CSS Class |
|---|---|---|---|
| `surface-primary` | `#FFFFFF` | `#0F172A` | `bg-surface-primary` |
| `surface-secondary` | `#F9FAFB` | `#1E293B` | `bg-surface-secondary` |
| `surface-tertiary` | `#F3F4F6` | `#334155` | `bg-surface-tertiary` |

### Semantic Text Tokens

| Token | Light | Dark | CSS Class |
|---|---|---|---|
| `text-primary` | `#111827` | `#F8FAFC` | `text-text-primary` |
| `text-secondary` | `#6B7280` | `#94A3B8` | `text-text-secondary` |
| `text-tertiary` | `#9CA3AF` | `#64748B` | `text-text-tertiary` |

### Semantic Border Tokens

| Token | Light | Dark | CSS Class |
|---|---|---|---|
| `border-default` | `#E5E7EB` | `#334155` | `border-border` |
| `border-subtle` | `#F3F4F6` | `#1E293B` | `border-border-subtle` |

### Status Colors (3 stops each)

| Status | Light BG | Default | Dark Text |
|---|---|---|---|
| Success | `success-light` `#ECFDF5` | `success` `#10B981` | `success-dark` `#065F46` |
| Warning | `warning-light` `#FFFBEB` | `warning` `#F59E0B` | `warning-dark` `#92400E` |
| Error | `error-light` `#FEF2F2` | `error` `#EF4444` | `error-dark` `#991B1B` |
| Info | `info-light` `#EFF6FF` | `info` `#3B82F6` | `info-dark` `#1E40AF` |

---

## Typography

**Font family:** Inter (sans-serif), JetBrains Mono (monospace)

### Sizes

| Token | Value | Usage |
|---|---|---|
| `text-xs` | 12px | Badges, captions, timestamps |
| `text-sm` | 14px | Body text, labels, descriptions |
| `text-base` | 15px | Default body, inputs |
| `text-lg` | 18px | Section headings, card titles |
| `text-xl` | 22px | Page titles |
| `text-2xl` | 28px | Hero headings, stats |

### Weights

| Token | Value | Usage |
|---|---|---|
| `font-normal` | 400 | Body text, descriptions |
| `font-medium` | 500 | Labels, buttons, nav items, emphasis |
| `font-semibold` | 600 | Headings, strong emphasis, key metrics |

### Line Heights

| Token | Value | Usage |
|---|---|---|
| `leading-tight` | 1.3 | Headings, large text |
| `leading-normal` | 1.5 | Body text (default) |
| `leading-relaxed` | 1.7 | Long-form content, descriptions |

### Do's

- Use `text-text-primary` for headings, key content
- Use `text-text-secondary` for descriptions, help text
- Use `text-text-tertiary` for placeholders, timestamps, disabled
- Use `font-medium` for interactive elements (buttons, links, tabs)
- Use `font-semibold` sparingly — only for headings and key metrics

### Don'ts

- No `text-transform: uppercase` except for very small labels (badge text)
- No `letter-spacing` wider than `0.02em`
- No `font-bold` (700) — `font-semibold` (600) is the maximum
- No more than 3 font weights on a single page

---

## Spacing

**Base unit:** 4px

| Token | Value | Usage |
|---|---|---|
| `0` | 0px | |
| `1` | 4px | Tight gaps (icon-text) |
| `2` | 8px | Related items, compact padding |
| `3` | 12px | Form field gaps, small padding |
| `4` | 16px | Standard padding, section gaps |
| `5` | 20px | Card padding, generous gaps |
| `6` | 24px | Section spacing |
| `8` | 32px | Major section breaks |
| `10` | 40px | Page section spacing |
| `12` | 48px | Large page sections |
| `16` | 64px | Hero/viewport spacing |

### Guidelines

- Use the scale. No magic numbers (e.g., `padding: 13px`).
- Space between related items: `gap-2` or `gap-3`
- Space between sections: `gap-6` or `gap-8`
- Page horizontal padding: `px-6` (desktop), `px-4` (mobile)
- Card internal padding: `p-5` or `p-6`

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 4px | Small elements (badges, tags, tooltips) |
| `rounded` / `rounded-md` | 6px | Buttons, inputs, cards, modals |
| `rounded-lg` | 8px | Large cards, panels, dropdowns |
| `rounded-full` | 9999px | Avatars, pills, dot indicators |

### Don'ts

- No radius larger than 8px except `rounded-full` for pills/avatars
- No `rounded-none` on interactive elements

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards, subtle elevation |
| `shadow` | `0 1px 3px rgba(0,0,0,0.08)` | Default elevation, buttons |
| `shadow-md` | `0 2px 8px rgba(0,0,0,0.08)` | Dropdowns, popovers, tooltips |
| `shadow-lg` | `0 4px 16px rgba(0,0,0,0.1)` | Modals, sheets, dialogs |

### Guidelines

- Cards: `shadow-sm` or border, not both (prefer border)
- Floating elements (dropdowns, tooltips): `shadow-md`
- Modals/sheets: `shadow-lg`
- Never use shadows heavier than `shadow-lg`

---

## Transitions

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | 120ms | Micro-interactions (hover color, opacity) |
| `duration-[200ms]` | 200ms | Default transitions (expand, slide) |
| `duration-slow` | 300ms | Large animations (modal enter, page transitions) |

All transitions use `ease-out` timing.

---

## Do's and Don'ts

### Do

- Use semantic tokens (`bg-surface-primary`, `text-text-secondary`) for theme-aware styling
- Use raw scale tokens (`neutral-200`, `primary-600`) when you need exact colors regardless of theme
- Keep max-width on content pages: `max-w-5xl` (1024px) or `max-w-6xl` (1152px)
- Use `gap-*` instead of margins for spacing between siblings
- Prefer `border-border` over custom border colors

### Don't

- No hardcoded hex colors in component files (use tokens)
- No inline `style={{}}` for colors, spacing, or radii (use Tailwind classes)
- No `dark:bg-slate-*` or `dark:text-slate-*` — use semantic tokens that auto-swap
- No gradients
- No shadows heavier than `0 4px 16px rgba(0,0,0,0.1)`
- No border radius larger than 8px (except pills/avatars)
- No more than 1 accent color (primary/indigo) + neutrals + status colors
- No decorative elements that don't serve a function
