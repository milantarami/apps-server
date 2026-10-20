---
name: dashboard-design
description: Visual system and UI conventions for this dashboard - tokens in src/styles/tokens.css, CSS Modules, the shared ui/ primitives, editorial copy voice, dark mode, accessibility and responsive rules. Use before building, restyling or reviewing any screen, component, dialog, empty/loading/error state, or copy in src/.
---

# Dashboard design

The look is editorial and warm: linen/paper surfaces, garnet accent, brass and sage for warn/success, Fraunces
display headlines, Manrope body, JetBrains Mono for tokens/ids/JSON. It follows the system light/dark preference.
Extend this system; don't introduce a second one.

## Before you write UI

Read `src/styles/tokens.css`, `src/styles/base.css`, and one existing screen in the same area
(e.g. `features/devices/view/DevicesScreen.tsx` + `Devices.module.css`).

## Rules

- **Tokens only.** Colors via semantic `--color-*` (never raw hex or the palette vars like `--garnet-600` in
  components), spacing `--space-1..9`, type `--text-*` / `--weight-*` / `--leading-*`, radii `--radius-*`,
  shadows `--shadow-*`, motion `--dur-*` + `--ease-*`, layers `--z-*`. Need a new value? Add a semantic token to
  `tokens.css` with both light and dark definitions.
- **Dark mode is automatic.** Semantic tokens are redefined under `prefers-color-scheme: dark`; check any new
  color there too.
- **Styling** is one `*.module.css` per screen/feature beside the view. No inline styles except CSS custom
  properties for data-driven values (`style={{ "--share": x }}`, see `BreakdownList`).
- **Reuse `src/ui/`**: `Button` (primary/secondary/quiet/danger, `loading`), `Notice` (tones), `StateBlock`
  (loading/empty), `Pill`, `SectionHeading`, `FieldError`, `ReasonList`, `Icon`, `format.ts`. Add to `ui/` only
  when a second feature needs it.
- **Every data view has four states**: loading (`StateBlock loading`), error (`Notice tone="error"` with a title),
  empty (says what to do next), and data. Keep stale data visible while refreshing (button `loading`).
- **Copy voice**: short, plain, second person. Screen headlines use a Fraunces line with one `<em>` word
  ("Who's <em>listening</em>."). Buttons are verbs ("Send", "Switch off", "Check receipts"). Errors say what
  happened and what to do. Numbers through `formatCount`; tokens shortened with `previewToken`.
- **Destructive or broad actions** (broadcast to all/platform, switching off a device) confirm first and show the
  impact (device count) before the user commits.
- **Accessibility**: real `<button>`/`<label>`/headings in order; `aria-label` on icon-only buttons; decorative
  icons `aria-hidden`; visible focus via `--color-focus`; controls ≥ `--control-height` (44px); text contrast
  ≥ 4.5:1 in both themes; respect `prefers-reduced-motion` for anything beyond a fade.
- **Responsive**: breakpoints are 760px (md) and 1100px (lg) as literals in media queries; content caps at
  `--content-max`. Must work at 360px wide with no horizontal scroll; wide tables scroll inside their container.
