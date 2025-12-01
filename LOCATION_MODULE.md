# Location & Subtree System

This document summarizes the new **Location & Subtree** platform we added to the REMS backend + frontend.

## 1. Database & Schema

- `Location` table:
  - Columns: `id`, `name`, `type`, `parentId`, `createdAt`, `updatedAt`.
  - Self-referencing relation `parentId` with `ON DELETE CASCADE` so deleting a node removes its descendants automatically.
  - Unique constraint `UNIQUE(type, name, parentId)` to keep each level tidy.
  - Indexes on `parentId`, `type`, and `locationId` join column on `Property`.

- `Property.locationId` now references the `Location` tree (via the `PropertyLocationMapping` relation) while keeping the previous `location` text field for backward compatible UI.

## 2. Backend API Endpoints

New REST surface for managing the hierarchy:

| Method | Path | Description |
| --- | --- | --- |
| `POST /api/locations` | Create a new node (name/type/parent) |
| `GET /api/locations/tree` | Return the entire tree with property counts attached |
| `GET /api/locations/:id/children` | Fetch direct children for a node |
| `GET /api/locations/:id/subtree` | Return a node plus its descendants and subtree property count |
| `GET /api/locations/search?q=` | Text search on node names |
| `PUT /api/locations/:id` | Update name/type/parent (cycle prevention via recursive CTE) |
| `DELETE /api/locations/:id` | Delete node + descendants (`CASCADE` from Prisma) |

Highlights:

- Recursive CTEs fetch subtree IDs and property counts for subtree filtering.
- DTOs/`zod` validation ensure clean requests.
- The `getSubtreeIds` helper exposes all descendant IDs for property filters.

## 3. Frontend Integration

- `LocationTreePanel` (see `components/locations/location-tree-panel.tsx`) exposes:
  - Real-time tree browsing with search + highlight.
  - Add-location form that re-validates the tree and notifies the parent via `onNodeAdded`.
  - `selectedId` + `onSelect` props so the property list can react.
  - `useLocationTree` & `useSubtree` keep the UI in sync with `/api/locations` (SWR-powered).

- `LocationSelector` is the multi-level dropdown used in the property form:
  - Cascading selects driven by the hierarchy.
  - Auto-fetches children for the current path (`/api/locations/:id/children`).
  - Clears selection and normalizes the final `locationId` for the backend.

## 4. Property Module Usage

- `GET /api/properties` now accepts `locationId` (a subtree root). The route uses `getSubtreeIds` to load child IDs and applies `WHERE locationId IN (...)`.
- The property listing page (`app/details/properties/page.tsx`) now:
  - Hosts the `LocationTreePanel` beside the table.
  - Uses `selectedLocationId` + `searchTerm` to call `apiService.properties.getAll({ locationId, search })`.
  - Adds a “Location” column so users can see the resolved node name.
  - Clears the filter when the same node is clicked twice or when “Clear location filter” is pressed.

- The Add Property dialog (`components/properties/add-property-dialog.tsx`) includes the new selector and forwards `locationId` in the payload. The backend will store that ID and backfill `locationNode` on subsequent fetches.

## 5. Example Usage

```http
POST /api/locations
{
  "name": "Phase 7",
  "type": "phase",
  "parentId": "city-uuid"
}
```

```http
GET /api/properties?locationId=phase-uuid&search=park
```

Properties returned from the backend now contain `locationNode` (see `propertiesWithStats` in `routes/properties.ts`) so the frontend can display hierarchical metadata.

## 6. Tests

- `server/src/__tests__/location.service.test.ts` validates tree building/sorting and ensures property counts are preserved without hitting the database.

## 7. Next Steps / Verification

- Run `npm run lint` and `npm test` (existing suite) to confirm there are no regressions.
- If you’re running migrations locally run `npx prisma migrate dev` to apply the new `20251127180000_location_hierarchy` migration.

## 3. Frontend Integration


