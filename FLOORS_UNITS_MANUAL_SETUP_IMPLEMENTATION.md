# Floors & Units Management - Manual Setup Implementation

## Overview
This document describes the implementation of a manual Floors & Units Management feature for the Property Management app. After adding a property, users are redirected to a "Property Structure Setup" page where they can manually add floors and units.

## Implementation Summary

### 1. Backend API Endpoints

#### New Endpoints Added:

**GET `/api/properties/:id/structure`**
- Returns complete property structure with floors and units
- Response includes:
  - Property information
  - All floors with their units
  - Summary statistics (total floors, total units, occupied/vacant counts)

**POST `/api/properties/:id/floors`**
- Creates a new floor for a property
- Request body:
  ```json
  {
    "name": "Ground Floor",
    "floorNumber": 0,
    "description": "Optional description"
  }
  ```

**POST `/api/units/floors/:floorId/units`**
- Creates a new unit for a specific floor
- Request body:
  ```json
  {
    "unitName": "101",
    "unitType": "1BHK",
    "status": "Vacant",
    "monthlyRent": 50000
  }
  ```

#### Existing Endpoints Used:
- `GET /api/floors/property/:propertyId` - Get all floors for a property
- `GET /api/floors/:id` - Get floor by ID
- `PUT /api/floors/:id` - Update floor
- `DELETE /api/floors/:id` - Delete floor (soft delete)
- `GET /api/units/:id` - Get unit by ID
- `PUT /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Delete unit (soft delete)

### 2. Frontend Components

#### Property Structure Setup Page
**Location**: `app/properties/[id]/structure/page.tsx`

**Features**:
- Displays all floors for a property
- Expandable/collapsible floor sections
- Shows units under each floor
- Add/Edit/Delete floors
- Add/Edit/Delete units
- Unit type selection (Studio, 1BHK, 2BHK, 3BHK, 4BHK, Shop, Office, Warehouse, Other)
- Status management (Vacant, Occupied, Under Maintenance)
- Monthly rent input

**UI Flow**:
1. User lands on structure page after creating property
2. Page shows empty state if no floors exist
3. User clicks "Add Floor" button
4. Dialog opens for floor name and optional floor number
5. After saving, floor appears in list
6. User expands floor to see units
7. User clicks "Add Unit" for a floor
8. Dialog opens for unit details (name, type, status, rent)
9. Units are displayed as cards under each floor

### 3. Database Schema

#### Floor Model (Existing)
```prisma
model Floor {
  id          String   @id @default(uuid())
  name        String   // Floor name (e.g., "Ground Floor", "1st Floor")
  floorNumber Int?     // Optional numeric order index
  propertyId  String
  description String?
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  units       Unit[]
}
```

#### Unit Model (Existing)
```prisma
model Unit {
  id          String   @id @default(uuid())
  unitName    String   // Unit name/number (free text)
  propertyId  String
  blockId     String?
  floorId     String?
  status      String   @default("Vacant") // Vacant, Occupied, Under Maintenance
  monthlyRent Float?
  description String?  // Currently used to store unitType (Studio, 1BHK, etc.)
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  floor       Floor?   @relation(fields: [floorId], references: [id], onDelete: SetNull)
  tenant      Tenant?
  leases      Lease[]
}
```

**Note**: The `description` field in the Unit model is currently used to store the unit type. For a production system, consider adding a dedicated `unitType` field.

### 4. API Service Updates

**File**: `lib/api.ts`

Added methods:
```typescript
properties: {
  // ... existing methods
  getStructure: (id: string) => api.get(`/properties/${id}/structure`),
  createFloor: (id: string, data: any) => api.post(`/properties/${id}/floors`, data),
}

units: {
  // ... existing methods
  createForFloor: (floorId: string, data: any) => api.post(`/units/floors/${floorId}/units`, data),
}

floors: {
  // ... existing methods (already existed)
}
```

### 5. Property Creation Flow Update

**File**: `components/properties/add-property-dialog.tsx`

**Changes**:
- Added `useRouter` hook
- After successful property creation, redirects to structure setup page
- Removed auto-unit creation logic (now manual only)
- Redirect path: `/properties/${propertyId}/structure`

### 6. Validation Rules

#### Floor Validation:
- Floor name is required (non-empty string)
- Floor name must be unique within property (enforced by backend)
- Floor number is optional (integer)
- Floor number can be used for ordering

#### Unit Validation:
- Unit name is required (non-empty string)
- Unit name must be unique within property (enforced by backend)
- Unit type is optional (dropdown selection)
- Status defaults to "Vacant"
- Monthly rent is optional (positive number)

### 7. User Flow

1. **Create Property**:
   - User fills property form
   - Clicks "Save"
   - Property is created
   - User is automatically redirected to `/properties/{id}/structure`

2. **Add Floor**:
   - User clicks "Add Floor" button
   - Dialog opens
   - User enters floor name (required)
   - User optionally enters floor number
   - User clicks "Save Floor"
   - Floor appears in list

3. **Add Unit**:
   - User expands a floor
   - User clicks "Add Unit" button
   - Dialog opens
   - User enters:
     - Unit name/number (required)
     - Unit type (optional dropdown)
     - Status (defaults to Vacant)
     - Monthly rent (optional)
   - User clicks "Save Unit"
   - Unit appears under the floor

4. **Edit Floor/Unit**:
   - User clicks "Edit" button on floor or unit
   - Dialog opens with current values
   - User modifies values
   - User clicks "Save"
   - Changes are reflected immediately

5. **Delete Floor/Unit**:
   - User clicks "Delete" button
   - Confirmation dialog appears
   - User confirms deletion
   - Item is soft-deleted (isDeleted: true)
   - Item disappears from UI

### 8. Edge Cases Handled

- **Empty State**: Shows helpful message when no floors exist
- **No Units on Floor**: Shows message and "Add First Unit" button
- **Duplicate Names**: Backend validates and returns error
- **Missing Property**: Returns 404 if property doesn't exist
- **Missing Floor**: Returns 404 if floor doesn't exist
- **Network Errors**: Shows error toast with message
- **Loading States**: Shows spinner while fetching data

### 9. Data Structure

#### Property Structure Response:
```json
{
  "success": true,
  "data": {
    "property": {
      "id": "uuid",
      "name": "Property Name",
      "propertyCode": "PROP-001"
    },
    "floors": [
      {
        "id": "uuid",
        "name": "Ground Floor",
        "floorNumber": 0,
        "description": null,
        "units": [
          {
            "id": "uuid",
            "unitName": "101",
            "status": "Vacant",
            "monthlyRent": 50000,
            "description": "1BHK",
            "floorId": "uuid"
          }
        ],
        "unitCount": 1
      }
    ],
    "summary": {
      "totalFloors": 1,
      "totalUnits": 1,
      "occupiedUnits": 0,
      "vacantUnits": 1
    }
  }
}
```

### 10. Future Enhancements

1. **Add unitType Field**: Add dedicated `unitType` field to Unit model instead of using `description`
2. **Bulk Operations**: Allow adding multiple units at once
3. **Import/Export**: CSV import for bulk floor/unit creation
4. **Drag & Drop**: Reorder floors by dragging
5. **Floor Templates**: Pre-defined floor templates (e.g., "Standard Apartment Building")
6. **Unit Numbering Patterns**: Auto-suggest unit names based on patterns
7. **Visual Floor Plan**: Visual representation of floors and units

### 11. Testing Checklist

- [ ] Create property and verify redirect to structure page
- [ ] Add floor with name only
- [ ] Add floor with name and floor number
- [ ] Edit floor name and number
- [ ] Delete floor (should show confirmation)
- [ ] Add unit to floor
- [ ] Add unit with all fields (name, type, status, rent)
- [ ] Edit unit details
- [ ] Delete unit (should show confirmation)
- [ ] Verify units are displayed under correct floor
- [ ] Verify expand/collapse functionality
- [ ] Test with empty property (no floors)
- [ ] Test with floor that has no units
- [ ] Verify error handling for duplicate names
- [ ] Verify error handling for network failures

## Files Modified/Created

### Backend:
- `server/src/routes/properties.ts` - Added structure endpoint and create floor endpoint
- `server/src/routes/units.ts` - Added create unit for floor endpoint

### Frontend:
- `app/properties/[id]/structure/page.tsx` - **NEW** - Property Structure Setup page
- `components/properties/add-property-dialog.tsx` - Updated to redirect after creation
- `lib/api.ts` - Added new API methods

### Documentation:
- `FLOORS_UNITS_MANUAL_SETUP_IMPLEMENTATION.md` - This file

## Notes

- Unit type is currently stored in the `description` field. Consider adding a dedicated `unitType` field in a future migration.
- All deletions are soft deletes (isDeleted: true) to maintain data integrity.
- The structure page automatically expands all floors on initial load for better UX.
- Floor numbers are optional but recommended for proper ordering.

