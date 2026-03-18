# Roadmap App — Code Quality Review

> Generated: March 2026  
> Purpose: Track incremental cleanup and standardization work. Complete groups in order — each group is committed separately for easy rollback.

---

## Architecture at a Glance

```mermaid
flowchart TD
    rootLayout["app/layout.tsx (root layout)"]
    clientProviders["ClientProviders (providers.tsx)"]
    roadmapLayout["app/(roadmapViews)/layout.tsx — RoadmapContext + Auth guard + Modals + CRUD"]
    pages["Roadmap Pages (roadmap, timeline, category, editor...)"]
    acquisitionPages["Acquisition Pages (own state, own fetches)"]
    apiRoutes["API Routes (27 files)"]
    prisma["Prisma / PostgreSQL"]

    rootLayout --> clientProviders
    clientProviders --> roadmapLayout
    roadmapLayout --> pages
    roadmapLayout --> acquisitionPages
    pages --> apiRoutes
    acquisitionPages --> apiRoutes
    apiRoutes --> prisma
```

---

## Group 1 — Safe Removals (Zero Risk)

Dead files or exact duplicates. Deleting them changes nothing functional.

- [x] **1.1** Delete `src/components/ui/` — `button.tsx`, `badge.tsx`, `card.tsx` are exact duplicates of `components/ui/`. Nothing imports from `src/`.
- [x] **1.2** Delete `hooks/use-mobile.tsx` — duplicate of `components/ui/use-mobile.tsx`. Fixed `components/ui/sidebar.tsx` import first.
- [x] **1.3** Remove local `getStatusColor()`, `getCategoryColor()`, `formatDate()` from `components/roadmap-timeline.tsx` and `components/RoadmapView.tsx` — identical to canonical versions in `lib/utils/formatters.ts`. Replaced with import.

---

## Group 2 — Standardization (Low Risk)

Consistent patterns applied uniformly. Each is a small, targeted change.

- [ ] **2.1** Create `lib/constants/roadmap.ts` with `categories` and `statuses` arrays. Replace 5+ duplicate inline definitions in `roadmap-timeline.tsx`, `RoadmapView.tsx`, `item-form.tsx`, `editor-view-table.tsx`, and `layout.tsx`.
- [ ] **2.2** Convert dynamic `getServerSession` imports to static in acquisition, project, and sub-resource API routes. (~10 files)
- [ ] **2.3** Standardize DELETE responses to `204 No Content` across all API routes. Currently mixed between 204 and `200 { message }`.
- [ ] **2.4** Replace `window.confirm()` in `app/(roadmapViews)/timeline/page.tsx` with `<AlertDialog>` — same pattern already used correctly elsewhere.
- [ ] **2.5** Add brand color tokens to `tailwind.config.ts` (`brand-navy`, `brand-light`, `brand-metric`). Replace 12+ hardcoded `rgb(2_33_77)` strings across components.
- [ ] **2.6** *(Optional UX)* Add `toast.success()` calls on successful CRUD — `sonner` is installed and `<Toaster>` is mounted but never called.

---

## Group 3 — Duplicate Logic (Medium Risk, High Value)

These require more care but have the highest maintenance payoff.

- [ ] **3.1** Audit `app/api/milestones-clean/` routes — near-duplicate of `app/api/roadmap/milestones/`. Determine which UI flows call which, redirect, and remove the duplicate set.
- [ ] **3.2** Create `buildUpdateData(body, allowedFields)` helper in `lib/utils/` — replace the copy-pasted partial update builder in 8+ PATCH handlers.
- [ ] **3.3** Create `requireEditorSession()` helper in `lib/auth.ts` — replace the verbatim auth+role check block in ~15 API routes.
- [ ] **3.4** Extract `<RoadmapItemCard>` component — same JSX (status dot, title, link, metrics, editor dropdown) is copy-pasted across 5 files: `roadmap-timeline.tsx` (×2), `RoadmapView.tsx`, `roadmap/page.tsx`, `timeline/page.tsx`.
- [ ] **3.5** Extract `<MetricBadgeGroup label metrics />` component — the pirate/north-star badge group pattern appears 8+ times.
- [ ] **3.6** Extract `<RelevantLinksEditor>` component — duplicated identically in `item-form.tsx` and `project-form.tsx`.
- [ ] **3.7** Extract `<MultiSelectCombobox>` component — the `<Popover><Command>` multi-select pattern appears 3× in `item-form.tsx` and 1× in `project-form.tsx`.
- [ ] **3.8** Extract `<DispositionBadge disposition />` component — color-coded badge logic duplicated in `acquisitions/page.tsx` and `acquisition-tracker/page.tsx`.

---

## Group 4 — Structural Concerns (Awareness Only — Plan Separately)

Higher effort, requires dedicated planning before touching.

- [ ] **4.1** Split `app/(roadmapViews)/layout.tsx` (~652 lines) — currently a god file acting as Next.js layout, React Context provider, data fetching layer, modal state manager, auth guard, and sidebar. Extract `RoadmapProvider` to its own file.
- [ ] **4.2** Retire `components/roadmap-timeline.tsx` — contains 4 internal render functions (`renderTimelineView`, `renderCategoryView`, `renderEditorView`, `renderHorizontalRoadmapView`). Migration to page-based architecture already started under `app/(roadmapViews)/`.
- [ ] **4.3** Add shared acquisition state — `acquisitions` is fetched independently by 3+ pages. Consider an `AcquisitionContext` or `useAcquisitions()` hook similar to `RoadmapContext`.
- [ ] **4.4** Consolidate `providers.tsx` and `client-providers.tsx` — both wrap `SessionProvider` + `AuthProvider`. Not harmful but redundant nesting.
- [ ] **4.5** Migrate `relevantLinks` data format — field handles both old `string` format and new `{ url, text }` object format via inline type guards. A one-time data migration would let the guards be removed.

---

## Execution Notes

- Each group should be a **single commit** for easy rollback
- Groups 1 → 2 → 3 → 4 in order (each builds on the last)
- Group 4 items should each be planned individually before execution
