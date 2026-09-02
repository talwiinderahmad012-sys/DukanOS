# Sticky Header — Audit & Fix

Goal: the app header must stay **pinned at the top of the viewport** on **every**
page (public, auth, dashboard, POS, showcase) while the page content scrolls
underneath. It must never move, hide, or shake on scroll up/down, on desktop or
mobile.

## The one pitfall that breaks `position: sticky`

`position: sticky` resolves against its **nearest scroll-container ancestor**,
not the viewport. It silently does nothing when:

1. The nearest scroll container is `overflow-hidden` / `overflow-auto` /
   `overflow-y-auto` **and that container itself does not scroll** (e.g. it is
   auto-sized to its content), so the **document** ends up scrolling instead;
   or
2. The header is a descendant of an `overflow-hidden` element that is the
   scroller but the element scrolls away with the document.

Empirically confirmed (headless Chrome, `header.getBoundingClientRect().top`
after `window.scrollTo(0, 1200)`):

| Scenario | Header top after scroll | Verdict |
| --- | --- | --- |
| Dashboard shell `min-h-*` (auto-sized) + `overflow-hidden` main | `-1200` (scrolled away) | BROKEN |
| Dashboard shell `h-[100dvh]` (definite height) + inner `overflow-y-auto` | `0` (pinned) | FIXED |

## The two patterns used in this repo

### Pattern A — Public routes (document scroller)
`PWAProvider` renders a `flex min-h-[100dvh] flex-col` shell with **no definite
height**, so public pages scroll the **document** (the natural viewport
scroller). Every public header is `sticky top-0 z-50` directly against the
document → works with no extra structure.

The root `body` uses `min-h-[100dvh]` (not `100vh`) so mobile URL-bar height
changes can't reintroduce a document scroll that drags the sticky shell.

### Pattern B — Dashboard / POS (inner scroller)
`src/app/dashboard/layout.tsx` gives the shell a **definite height**
(`h-[100dvh]`), which bounds the flex chain so the inner page container
(`overflow-y-auto overscroll-contain`) becomes the **only** scroller and the
document never scrolls. The header is a **flex sibling** of that scroller, so it
is physically pinned by layout; `sticky top-0` is a free safety net.

## One sticky unit: banner + header
The connection banner (`ConnectionBanner`) is rendered as the **first child
inside** each header's single `sticky top-0 z-50` element. It carries **no own
`sticky`/`z-index`**. Two independent `sticky top-0` blocks would both resolve to
viewport top and the header would slide under the banner and disappear.

## Z-index hierarchy
- Header: `z-50` (above content / tables / cards).
- Header dropdown menus (avatar, notifications): `z-50` inside the header — the
  header has no `overflow-hidden`, so they are not clipped.
- Nav drawer / mobile backdrop: `z-[55]` / `z-[60]` (above header).
- Modals / dialogs / toasts / PWA install banner: `z-[60]`+ (above header).
- POS checkout secondary bar: `z-40` (intentionally below the `z-50` app header,
  pinned under it).

All headers use a **fully opaque** background (`bg-white` / `bg-surface`) so
content scrolling underneath can never bleed through. No `backdrop-blur` is used.
Dark mode needs no `dark:` variants: `globals.css` remaps the gray palette under
`.dark` (and `.dark .bg-white` swaps to the surface), so the bar is opaque in both
themes.

## Files changed
- `src/app/layout.tsx` — `body` `min-h-screen` → `min-h-[100dvh]`.
- `src/components/pwa/pwa-provider.tsx` — removed the standalone sticky banner
  block; exported `ConnectionBanner` (no own sticky/z-index) rendered as the
  first child of each header; kept `flex min-h-[100dvh] flex-col` shell for
  public routes.
- `src/components/layout/site-header.tsx` — single `sticky top-0 z-50` header
  with `ConnectionBanner` as first child.
- `src/components/layout/dashboard-header.tsx` — single `sticky top-0 z-50`
  header (`flex-col`) with `ConnectionBanner` as first child; dropdown `z-50`
  untouched.
- `src/components/layout/mobile-nav.tsx` — mobile header `sticky top-0 z-50`
  (`md:hidden`) with `ConnectionBanner` as first child; drawer `z-[60]` / backdrop
  `z-[55]` unchanged.
- `src/app/dashboard/layout.tsx` — shell `min-h-0 grow` → `h-[100dvh] min-h-0
  grow`; page container gained `overscroll-contain`.
- `src/app/terms|support|privacy|docs/page.tsx` — each `sticky top-0 z-50`
  header gained `ConnectionBanner` as first child.
- `src/components/showcase/lime-dashboard.tsx` — `Topbar` restructured to a
  single `sticky top-0 z-50` header (`flex-col`) with `ConnectionBanner` as first
  child.

## Verification
- Live headless-Chrome probe (desktop 1280×900 + mobile 390×844): 14/14 public
  routes (`/`, `/terms`, `/docs`, `/privacy`, `/support`, `/login`,
  `/onboarding`) — header `top` stays `0` after scrolling down 1500px and back up
  400px.
- Live headless-Chrome probe of the dashboard inner-scroller replica: header
  `top` stays `0` while the inner `overflow-y-auto` page container scrolls
  (`scrollTop` 0 → 1500 → 400).
- `npm run typecheck` → PASS. `npm run build` → PASS.
