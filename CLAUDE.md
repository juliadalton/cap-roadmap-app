# Roadmap App — Project Conventions

## Architecture

```
app/layout.tsx
  └── components/providers.tsx (SessionProvider + AuthProvider + Toaster)
        └── app/(roadmapViews)/layout.tsx
              └── context/roadmap-context.tsx (RoadmapProvider)
                    └── context/acquisition-context.tsx (AcquisitionProvider)
                          └── Pages: roadmap, timeline, category, editor, acquisitions,
                                     acquisition-tracker, technical-integration, presentation-builder
```

## Shared Files — Check Before Adding Anything New

| File | What lives there |
|------|-----------------|
| `lib/constants/roadmap.ts` | `CATEGORIES`, `STATUSES`, `PIRATE_METRICS_OPTIONS`, `NORTH_STAR_METRICS_OPTIONS` |
| `lib/utils/formatters.ts` | `getStatusColor()`, `getCategoryColor()`, `formatDate()` |
| `lib/auth.ts` | `authOptions`, `requireEditorSession()` |
| `context/roadmap-context.tsx` | All roadmap item + milestone state, CRUD handlers, sort/filter |
| `context/acquisition-context.tsx` | Acquisitions + projects data shared across pages |
| `types/roadmap.ts` | All shared TypeScript types |

Never redefine `CATEGORIES`, `STATUSES`, `getStatusColor`, `getCategoryColor`, or `formatDate` locally. Import them.

## Adding a New Page Under `/roadmapViews`

- Create `app/(roadmapViews)/your-page/page.tsx`
- Consume shared state via `useRoadmap()` and/or `useAcquisitions()` — do not fetch roadmap items or milestones independently
- Register any page-specific header buttons via `setHeaderActions()` in a `useEffect` with cleanup (`return () => setHeaderActions(null)`)

## Adding a New API Route

- Place under `app/api/` following existing domain grouping (e.g. `app/api/roadmap/`, `app/api/acquisitions/`)
- Use `requireEditorSession()` for all write operations — see `lib/auth.ts`
- Return `204 No Content` (no body) for all DELETE responses

---

## API Route Patterns

### Authentication & Authorization

Always use `requireEditorSession()` from `lib/auth.ts` for write operations. Never write raw `getServerSession` + role checks inline.

```typescript
// ✅ GOOD
import { requireEditorSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { userId, error } = await requireEditorSession();
  if (error) return error;
  // ... userId is typed string here
}

// ❌ BAD
const session = await getServerSession(authOptions);
if (!session?.user || session.user.role !== "editor") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

Read-only GET routes that need auth (viewer+) can call `getServerSession(authOptions)` directly — `requireEditorSession` is for editor-only writes.

### DELETE Responses

Always return `204 No Content` with no body.

```typescript
// ✅ GOOD
return new NextResponse(null, { status: 204 });

// ❌ BAD
return NextResponse.json({ message: "Deleted" }, { status: 200 });
```

### Prisma Usage

- Import `prisma` from `@/lib/prisma`
- Use `prisma.model.findUnique` / `findMany` / `create` / `update` / `delete` directly in route handlers
- For PATCH routes, only include fields that were actually sent — use a partial update object built from `body`

### Error Responses

```typescript
// 400 — bad input
return NextResponse.json({ error: "Descriptive message here." }, { status: 400 });

// 403 — use requireEditorSession(), which handles this automatically
// 404 — item not found
return NextResponse.json({ error: "Not found." }, { status: 404 });
// 500 — unexpected
return NextResponse.json({ error: "Internal server error." }, { status: 500 });
```

---

## Component Patterns

### Consuming Shared State

Use `useRoadmap()` for roadmap items, milestones, sort/filter state, and CRUD handlers. Use `useAcquisitions()` for acquisitions and projects. Never fetch these independently in a page.

```tsx
// ✅ GOOD
const { displayedItems, displayedMilestones, isEditor, openItemModal } = useRoadmap();

// ❌ BAD — fetching items directly in a page
const [items, setItems] = useState([]);
useEffect(() => { fetch("/api/roadmap/items").then(...) }, []);
```

### Confirmation Dialogs

Always use `<AlertDialog>` from `@/components/ui/alert-dialog`. Never use `window.confirm()`.

```tsx
// ✅ GOOD
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

<AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete item?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// ❌ BAD
if (window.confirm("Are you sure?")) { ... }
```

### Success Notifications

Call `toast.success()` from `sonner` after any successful create, update, or delete.

```tsx
import { toast } from "sonner";

// After save:
toast.success("Item saved");
// After delete:
toast.success("Item deleted");
```

### Brand Colors

Use Tailwind tokens — never raw `rgb()` strings.

| Token | Use for |
|-------|---------|
| `bg-brand-navy` / `text-brand-navy` | Navy headers, milestone dots, primary accents |
| `bg-brand-light` | Light blue-grey section backgrounds |
| `bg-brand-metric` | Pirate metric / north star metric badges |

### Component Extraction

**Before writing any new UI**, scan `components/` to check whether an existing component already covers the need or can be extended. Never duplicate UI that an existing component handles.

Extract JSX into a new component in `components/` when:
- The same block appears (or will appear) in more than one place, **or**
- The block is complex enough that isolating it improves readability

Existing shared components — use these before creating new ones:

- `<RoadmapItemCard>` — status dot, title, links, metrics, editor dropdown
- `<MetricBadgeGroup>` — pirate/north-star badge list
- `<RelevantLinksEditor>` — link add/remove input in forms
- `<MultiSelectCombobox>` — Popover+Command multi-select pattern
- `<DispositionBadge>` — color-coded acquisition disposition badge

### Rules of Hooks

Never call hooks (`useRoadmap`, `useState`, `useCallback`, etc.) inside loops, conditionals, or `.map()` callbacks. Always call at the top level of the component function.

```tsx
// ✅ GOOD — destructure everything at the top
const { focusedItemId, displayedMilestones } = useRoadmap();
displayedMilestones.map((m) => { if (focusedItemId) ... });

// ❌ BAD — hook call inside map
displayedMilestones.map((m) => {
  const { focusedItemId } = useRoadmap(); // violates Rules of Hooks
});
```
