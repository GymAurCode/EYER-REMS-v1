# Floors & Units Management System - Complete Design Specification

## 1. Floor Generation Logic

### 1.1 Input Phase
- User enters **Total Floors** (integer, minimum: 1, maximum: 100)
- System presents two options:
  - **Auto-generate Floors** (default)
  - **Custom Floor Names** (manual entry)

### 1.2 Auto-Generation Pattern
When "Auto-generate" is selected:
- System generates floors sequentially starting from lowest to highest
- **Floor Number Assignment**:
  - Basement (if selected): `floorNumber = -1`
  - Ground Floor: `floorNumber = 0`
  - Mezzanine (if selected): `floorNumber = 0.5` (stored as decimal, displayed as "Mezzanine")
  - Regular Floors: `floorNumber = 1, 2, 3, ...` (up to total floors)
  - Penthouse (if selected): `floorNumber = totalFloors + 1`

- **Floor Name Generation**:
  - Basement: "Basement" or "B1", "B2" if multiple
  - Ground Floor: "Ground Floor" or "G"
  - Mezzanine: "Mezzanine" or "M"
  - Regular: "1st Floor", "2nd Floor", "3rd Floor", etc.
  - Penthouse: "Penthouse" or "PH"

### 1.3 Custom Floor Names
When "Custom Floor Names" is selected:
- User can manually enter name for each floor
- Each floor must have a unique name within the property
- Floor number is auto-assigned based on position (same logic as auto-generation)
- User can override floor number if needed

### 1.4 Special Floor Options
System provides checkboxes for:
- **Basement**: Adds basement floor(s) before ground floor
- **Ground Floor**: Always included (can be renamed)
- **Mezzanine**: Optional floor between ground and first floor
- **Penthouse**: Adds penthouse as topmost floor

**Example Flow:**
```
Total Floors: 5
☑ Basement
☑ Ground Floor
☐ Mezzanine
☑ Penthouse

Generated Structure:
- Basement (floorNumber: -1)
- Ground Floor (floorNumber: 0)
- 1st Floor (floorNumber: 1)
- 2nd Floor (floorNumber: 2)
- 3rd Floor (floorNumber: 3)
- 4th Floor (floorNumber: 4)
- 5th Floor (floorNumber: 5)
- Penthouse (floorNumber: 6)
```

---

## 2. Unit Generation Per Floor

### 2.1 Unit Count Input
- Each floor expands to show a **Units Count** input field
- User enters number of units per floor (minimum: 1, maximum: 999)
- Units are generated immediately after count is entered

### 2.2 Auto-Generation Patterns

#### Pattern 1: Sequential Floor-Based (Default)
Formula: `floorNumber * 100 + unitIndex`

**Examples:**
- Floor 1 (floorNumber: 1): Units 101, 102, 103, ..., 199
- Floor 2 (floorNumber: 2): Units 201, 202, 203, ..., 299
- Floor 0 (Ground): Units 001, 002, 003, ..., 099
- Floor -1 (Basement): Units B01, B02, B03, ..., B99
- Penthouse: Units PH01, PH02, PH03, ..., PH99

**Implementation Logic:**
```javascript
function generateUnitName(floorNumber, unitIndex, totalUnits) {
  if (floorNumber === -1) {
    // Basement
    return `B${String(unitIndex).padStart(2, '0')}`;
  } else if (floorNumber === 0) {
    // Ground Floor
    return String(unitIndex).padStart(3, '0');
  } else if (floorNumber > 0 && floorNumber <= 99) {
    // Regular floors
    return String(floorNumber * 100 + unitIndex);
  } else if (floorNumber > 99) {
    // Penthouse or high floors
    return `PH${String(unitIndex).padStart(2, '0')}`;
  }
}
```

#### Pattern 2: Custom Prefix Pattern
User can set custom prefix per floor:
- Floor 1: Prefix "A" → A01, A02, A03...
- Floor 2: Prefix "B" → B01, B02, B03...
- Ground: Prefix "G" → G01, G02, G03...

#### Pattern 3: Sequential Global
Units numbered sequentially across all floors:
- Basement: 1, 2, 3...
- Ground: 4, 5, 6...
- Floor 1: 7, 8, 9...

### 2.3 Custom Unit Naming
- User can override any auto-generated unit name
- Custom names can be any string (alphanumeric, special characters allowed)
- System validates uniqueness within property
- Custom names are preserved even if floor/unit count changes

---

## 3. Auto-Generation Patterns (Detailed)

### 3.1 Floor-Based Sequential (Primary Pattern)
```
Floor 1 (5 units): 101, 102, 103, 104, 105
Floor 2 (3 units): 201, 202, 203
Ground (4 units): 001, 002, 003, 004
Basement (2 units): B01, B02
```

### 3.2 Zero-Padded Sequential
```
Floor 1: 101, 102, 103... (always 3 digits)
Floor 2: 201, 202, 203...
Ground: 001, 002, 003...
```

### 3.3 Alphanumeric Pattern
```
Floor 1: 1A, 1B, 1C...
Floor 2: 2A, 2B, 2C...
```

### 3.4 Custom Pattern Builder
User can define pattern template:
- Template: `{floor}-{unit}` → Results: "1-1", "1-2", "2-1", "2-2"
- Template: `F{floor}U{unit}` → Results: "F1U1", "F1U2", "F2U1"

---

## 4. Custom Naming System

### 4.1 Custom Floor Names
- User can override auto-generated floor names
- Validation:
  - Must be unique within property
  - Cannot be empty
  - Max length: 50 characters
  - Allowed: letters, numbers, spaces, hyphens, underscores

### 4.2 Custom Unit Names
- Each unit can have custom name
- Validation:
  - Must be unique within property (not just within floor)
  - Cannot be empty
  - Max length: 20 characters
  - Allowed: letters, numbers, spaces, hyphens, underscores, slashes

### 4.3 Mixed Mode
- System supports mix of auto-generated and custom names
- User can:
  1. Generate all units automatically
  2. Selectively customize specific unit names
  3. Revert custom names back to auto-generated

---

## 5. Data Structure (JSON)

### 5.1 Frontend Structure (Before Save)
```json
{
  "propertyId": "uuid",
  "totalFloors": 5,
  "hasBasement": true,
  "hasMezzanine": false,
  "hasPenthouse": true,
  "floorGenerationMode": "auto", // "auto" | "custom"
  "unitGenerationMode": "floor-based", // "floor-based" | "sequential" | "custom-prefix" | "custom-template"
  "floors": [
    {
      "floorId": "temp-1", // Temporary ID for new floors
      "name": "Basement",
      "floorNumber": -1,
      "isCustom": false,
      "unitCount": 2,
      "unitPrefix": "B",
      "units": [
        {
          "unitId": "temp-u1",
          "unitName": "B01",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u2",
          "unitName": "B02",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        }
      ]
    },
    {
      "floorId": "temp-2",
      "name": "Ground Floor",
      "floorNumber": 0,
      "isCustom": false,
      "unitCount": 4,
      "unitPrefix": null,
      "units": [
        {
          "unitId": "temp-u3",
          "unitName": "001",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u4",
          "unitName": "002",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u5",
          "unitName": "003",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u6",
          "unitName": "004",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        }
      ]
    },
    {
      "floorId": "temp-3",
      "name": "1st Floor",
      "floorNumber": 1,
      "isCustom": false,
      "unitCount": 5,
      "unitPrefix": null,
      "units": [
        {
          "unitId": "temp-u7",
          "unitName": "101",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u8",
          "unitName": "102",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u9",
          "unitName": "103",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u10",
          "unitName": "104",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        },
        {
          "unitId": "temp-u11",
          "unitName": "105",
          "isCustom": false,
          "status": "Vacant",
          "monthlyRent": null
        }
      ]
    }
  ]
}
```

### 5.2 Backend Response Structure (After Save)
```json
{
  "success": true,
  "data": {
    "propertyId": "uuid",
    "floors": [
      {
        "id": "floor-uuid-1",
        "name": "Basement",
        "floorNumber": -1,
        "propertyId": "property-uuid",
        "description": null,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "units": [
          {
            "id": "unit-uuid-1",
            "unitName": "B01",
            "propertyId": "property-uuid",
            "blockId": null,
            "floorId": "floor-uuid-1",
            "status": "Vacant",
            "monthlyRent": null,
            "description": null,
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
          }
        ],
        "_count": {
          "units": 2
        }
      }
    ],
    "summary": {
      "totalFloors": 7,
      "totalUnits": 20,
      "occupiedUnits": 0,
      "vacantUnits": 20
    }
  }
}
```

---

## 6. Backend Model Structure

### 6.1 Floor Model (Prisma Schema)
```prisma
model Floor {
  id          String   @id @default(uuid())
  name        String   // "Basement", "Ground Floor", "1st Floor", etc.
  floorNumber Int?     // -1 (basement), 0 (ground), 1, 2, 3... (regular), 100+ (penthouse)
  propertyId  String
  description String?
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  units       Unit[]

  @@index([propertyId])
  @@index([floorNumber])
  @@index([isDeleted])
  @@unique([propertyId, floorNumber]) // Ensure unique floor numbers per property
  @@unique([propertyId, name]) // Ensure unique floor names per property
}
```

### 6.2 Unit Model (Prisma Schema - Enhanced)
```prisma
model Unit {
  id          String   @id @default(uuid())
  unitName    String   // "101", "B01", "PH01", or custom name
  propertyId  String
  blockId     String?
  floorId     String?
  status      String   @default("Vacant") // Occupied, Vacant, Under-Maintenance
  monthlyRent Float?
  description String?
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  block       Block?   @relation(fields: [blockId], references: [id], onDelete: SetNull)
  floor       Floor?   @relation(fields: [floorId], references: [id], onDelete: SetNull)
  tenant      Tenant?
  leases      Lease[]
  maintenanceHistory Json?

  @@index([propertyId])
  @@index([blockId])
  @@index([floorId])
  @@index([status])
  @@index([isDeleted])
  @@unique([propertyId, unitName]) // Ensure unique unit names per property
}
```

### 6.3 Database Constraints
- **Floor**: Unique combination of `(propertyId, floorNumber)` and `(propertyId, name)`
- **Unit**: Unique combination of `(propertyId, unitName)`
- **Cascade Deletes**: Deleting property deletes all floors and units
- **Set Null on Floor Delete**: If floor is deleted, units remain but `floorId` becomes null

---

## 7. Edge Cases & Validation Rules

### 7.1 Floor Validation
- **Total Floors**: Must be between 1 and 100
- **Floor Number**: Must be unique within property
- **Floor Name**: Must be unique within property
- **Special Floors**: 
  - Only one basement allowed (floorNumber: -1)
  - Only one ground floor allowed (floorNumber: 0)
  - Only one mezzanine allowed (floorNumber: 0.5)
  - Only one penthouse allowed (floorNumber: totalFloors + 1)
- **Floor Order**: Floors must be in logical order (basement < ground < mezzanine < 1st < 2nd < ... < penthouse)

### 7.2 Unit Validation
- **Unit Count**: Must be between 1 and 999 per floor
- **Unit Name**: Must be unique within property (not just within floor)
- **Unit Name Format**: 
  - Auto-generated: Must match pattern (e.g., 101-199 for floor 1)
  - Custom: Any string, max 20 characters
- **Floor Assignment**: Unit's floorId must match the floor it's assigned to
- **Block Assignment**: If block is specified, block must belong to same property

### 7.3 Wrong Mapping Detection

#### Case 1: Unit Name Mismatch with Floor
**Example**: Unit "301" placed in Floor 1
**Detection Logic**:
```javascript
function validateUnitFloorMapping(unitName, floorNumber) {
  // Extract expected floor from unit name
  const expectedFloor = extractFloorFromUnitName(unitName);
  
  // For pattern 101-199, expected floor is 1
  if (unitName.match(/^[1-9]\d{2}$/)) {
    const firstDigit = parseInt(unitName[0]);
    if (firstDigit !== floorNumber) {
      return {
        valid: false,
        error: `Unit ${unitName} should be on Floor ${firstDigit}, not Floor ${floorNumber}`
      };
    }
  }
  
  return { valid: true };
}
```

**Resolution Options**:
1. **Auto-correct**: Move unit to correct floor
2. **Warning**: Show warning but allow custom placement
3. **Reject**: Prevent saving until corrected

#### Case 2: Duplicate Unit Names
**Detection**: Check `(propertyId, unitName)` uniqueness
**Resolution**: 
- Show error with conflicting unit details
- Suggest rename option
- Prevent save until resolved

#### Case 3: Missing Floor Assignment
**Detection**: Unit has no `floorId` but property has floors
**Resolution**:
- Auto-assign to ground floor (floorNumber: 0)
- Or require manual assignment

#### Case 4: Floor Number Gaps
**Example**: Floors 1, 2, 4, 5 (missing floor 3)
**Detection**: Check sequential floor numbers
**Resolution**:
- Warning: "Floor numbers are not sequential"
- Option to auto-renumber or keep as-is

### 7.4 Data Integrity Rules
- **Cascade Rules**:
  - Delete property → Delete all floors → Delete all units
  - Delete floor → Set unit.floorId to null (preserve units)
  - Delete block → Set unit.blockId to null (preserve units)
  
- **Referential Integrity**:
  - Unit.floorId must reference existing Floor.id
  - Unit.blockId must reference existing Block.id (if provided)
  - Floor.propertyId must reference existing Property.id

- **Business Rules**:
  - Cannot delete floor if it has occupied units (soft delete only)
  - Cannot change unit name if unit has active tenant
  - Cannot change floor number if floor has units assigned

---

## 8. Complete User Flow

### Step 1: Property Selection
- User selects or creates a property
- System loads existing floors/units if any

### Step 2: Floor Configuration
```
User Action: Enters "Total Floors: 5"
System Response: 
  - Shows floor generation options
  - Displays checkboxes for Basement, Mezzanine, Penthouse
  - Shows "Auto-generate" vs "Custom Names" toggle
```

### Step 3: Floor Generation
```
If Auto-generate selected:
  - System generates floor list:
    * Basement (if checked)
    * Ground Floor
    * Mezzanine (if checked)
    * 1st Floor, 2nd Floor, ..., 5th Floor
    * Penthouse (if checked)
  
If Custom Names selected:
  - System shows input fields for each floor
  - User can rename each floor
  - System validates uniqueness
```

### Step 4: Unit Count Input
```
For each floor:
  - User sees expandable section
  - User enters "Units Count" (e.g., 5)
  - System immediately generates units using selected pattern
```

### Step 5: Unit Pattern Selection
```
User selects pattern:
  - Floor-based (101-199, 201-299...)
  - Sequential global (1, 2, 3...)
  - Custom prefix per floor
  - Custom template

System generates unit names accordingly
```

### Step 6: Unit Customization
```
For each generated unit:
  - User can click to edit name
  - User can set monthly rent
  - User can set status (Vacant/Occupied)
  - System validates uniqueness
```

### Step 7: Validation & Preview
```
System performs:
  - Floor validation (unique names, logical order)
  - Unit validation (unique names, correct floor mapping)
  - Wrong mapping detection
  - Shows preview table:
    Floor | Floor # | Units | Unit Names
    ------|--------|-------|------------
    Basement | -1 | 2 | B01, B02
    Ground | 0 | 4 | 001, 002, 003, 004
    ...
```

### Step 8: Error Resolution
```
If errors detected:
  - System highlights problematic floors/units
  - Shows specific error messages
  - Provides auto-fix suggestions
  - User must resolve before saving
```

### Step 9: Save Operation
```
User clicks "Save Floors & Units"

Backend Process:
  1. Validate all data
  2. Start transaction
  3. Create/update floors (in order)
  4. Create/update units (with floor assignments)
  5. Update property.totalUnits count
  6. Commit transaction
  
Response:
  - Success: Returns complete structure with IDs
  - Error: Returns specific validation errors
```

### Step 10: Confirmation & Display
```
System shows:
  - Success message
  - Summary: "Created 7 floors with 20 units"
  - Option to view/edit
  - Option to add more floors/units
```

---

## 9. API Endpoints

### 9.1 Create Floors & Units (Bulk)
```
POST /api/properties/:propertyId/floors-units/bulk

Request Body:
{
  "totalFloors": 5,
  "hasBasement": true,
  "hasMezzanine": false,
  "hasPenthouse": true,
  "floorGenerationMode": "auto",
  "unitGenerationMode": "floor-based",
  "floors": [...]
}

Response:
{
  "success": true,
  "data": {
    "floors": [...],
    "summary": {...}
  }
}
```

### 9.2 Validate Floor-Unit Mapping
```
POST /api/properties/:propertyId/floors-units/validate

Request Body: { "floors": [...] }

Response:
{
  "valid": true/false,
  "errors": [
    {
      "type": "unit_floor_mismatch",
      "unitName": "301",
      "currentFloor": 1,
      "expectedFloor": 3,
      "suggestion": "Move to Floor 3 or rename unit"
    }
  ],
  "warnings": [...]
}
```

### 9.3 Get Floors with Units
```
GET /api/properties/:propertyId/floors-units

Response:
{
  "success": true,
  "data": {
    "floors": [
      {
        "id": "...",
        "name": "1st Floor",
        "floorNumber": 1,
        "units": [...]
      }
    ]
  }
}
```

---

## 10. Frontend Component Structure

### 10.1 Main Component: `FloorsUnitsManager`
- Handles total floors input
- Manages floor generation mode
- Renders floor list with expandable units

### 10.2 Sub-Components
- `FloorInput`: Single floor configuration
- `UnitsTable`: Expandable units table per floor
- `UnitNameInput`: Editable unit name with validation
- `PatternSelector`: Unit generation pattern selection
- `ValidationSummary`: Shows all errors/warnings
- `PreviewTable`: Final preview before save

### 10.3 State Management
```typescript
interface FloorsUnitsState {
  propertyId: string;
  totalFloors: number;
  hasBasement: boolean;
  hasMezzanine: boolean;
  hasPenthouse: boolean;
  floorGenerationMode: 'auto' | 'custom';
  unitGenerationMode: 'floor-based' | 'sequential' | 'custom-prefix' | 'custom-template';
  floors: FloorData[];
  validationErrors: ValidationError[];
  isSaving: boolean;
}
```

---

## 11. Implementation Notes

### 11.1 Performance Considerations
- **Lazy Loading**: Load units only when floor is expanded
- **Debouncing**: Debounce unit name validation (500ms)
- **Batch Operations**: Save all floors/units in single transaction
- **Optimistic Updates**: Show preview immediately, sync on save

### 11.2 Error Handling
- **Network Errors**: Retry with exponential backoff
- **Validation Errors**: Show inline errors, prevent save
- **Partial Failures**: Rollback entire operation
- **Conflict Resolution**: Handle concurrent edits gracefully

### 11.3 Data Migration
- **Existing Properties**: Support adding floors/units to existing properties
- **Legacy Units**: Auto-assign orphaned units to ground floor
- **Import/Export**: Support CSV import for bulk creation

---

## 12. Testing Scenarios

### 12.1 Happy Path
1. Create property with 5 floors
2. Auto-generate floors
3. Add 5 units per floor
4. Save successfully
5. Verify all units created with correct floor assignments

### 12.2 Edge Cases
1. Unit "301" in Floor 1 → Should detect mismatch
2. Duplicate unit names → Should prevent save
3. Floor number gaps → Should show warning
4. Delete floor with occupied units → Should prevent or soft delete
5. Custom unit names with special characters → Should validate

### 12.3 Validation Tests
1. Total floors = 0 → Should reject
2. Total floors > 100 → Should reject
3. Unit count = 0 → Should reject
4. Duplicate floor names → Should reject
5. Duplicate unit names → Should reject

---

## Summary

This system provides a complete, flexible solution for managing floors and units in a property management application. It supports both automated generation and manual customization, with robust validation and error handling to ensure data integrity. The design is scalable, maintainable, and user-friendly while providing the flexibility needed for various property types and naming conventions.

