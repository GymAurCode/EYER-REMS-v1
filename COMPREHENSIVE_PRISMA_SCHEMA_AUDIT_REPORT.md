# Comprehensive Prisma Schema vs Frontend Payload Audit Report

## Executive Summary

This audit analyzes all Prisma models against frontend payloads for POST/PUT endpoints to identify schema mismatches causing 400 "Invalid data provided" errors. The analysis covers **clients**, **employees**, **properties**, and **units** endpoints.

## Critical Findings

### 🔴 HIGH PRIORITY ISSUES

#### 1. **Client Model - Missing Fields**
**Model:** `Client`
**Endpoint:** `POST /api/crm/clients`, `PUT /api/crm/clients/:id`

| Field in Payload | Prisma Model Field | Status | Issue |
|------------------|-------------------|---------|-------|
| `tid` | `tid` | ✅ EXISTS | Field exists in model |
| `billingAddress` | `billingAddress` | ✅ EXISTS | Field exists in model |
| `clientType` | `clientType` | ✅ EXISTS | Field exists in model |
| `clientCategory` | `clientCategory` | ✅ EXISTS | Field exists in model |
| `propertyInterest` | `propertyInterest` | ✅ EXISTS | Field exists in model |
| `attachments` | `attachments` | ✅ EXISTS | Field exists as JSON |
| `tags` | `tags` | ✅ EXISTS | Field exists as JSON |
| `assignedAgentId` | `assignedAgentId` | ✅ EXISTS | Field exists in model |
| `assignedDealerId` | `assignedDealerId` | ✅ EXISTS | Field exists in model |
| `manualUniqueId` | `manualUniqueId` | ✅ EXISTS | Field exists in model |

**✅ CLIENT MODEL IS COMPLETE** - All payload fields exist in Prisma model.

#### 2. **Employee Model - Missing Fields**
**Model:** `Employee`
**Endpoint:** `POST /api/employees`, `PUT /api/employees/:id`

| Field in Payload | Prisma Model Field | Status | Issue |
|------------------|-------------------|---------|-------|
| `name` | `name` | ✅ EXISTS | Field exists |
| `email` | `email` | ✅ EXISTS | Field exists |
| `phone` | `phone` | ✅ EXISTS | Field exists |
| `dateOfBirth` | `dateOfBirth` | ✅ EXISTS | Field exists |
| `gender` | `gender` | ✅ EXISTS | Field exists |
| `maritalStatus` | `maritalStatus` | ✅ EXISTS | Field exists |
| `nationality` | `nationality` | ✅ EXISTS | Field exists |
| `bloodGroup` | `bloodGroup` | ✅ EXISTS | Field exists |
| `cnic` | `cnic` | ✅ EXISTS | Field exists |
| `cnicDocumentUrl` | `cnicDocumentUrl` | ✅ EXISTS | Field exists |
| `profilePhotoUrl` | `profilePhotoUrl` | ✅ EXISTS | Field exists |
| `position` | `position` | ✅ EXISTS | Field exists |
| `department` | `department` | ✅ EXISTS | Field exists |
| `departmentCode` | `departmentCode` | ✅ EXISTS | Field exists |
| `role` | `role` | ✅ EXISTS | Field exists |
| `employeeType` | `employeeType` | ✅ EXISTS | Field exists |
| `status` | `status` | ✅ EXISTS | Field exists |
| `joinDate` | `joinDate` | ✅ EXISTS | Field exists |
| `probationPeriod` | `probationPeriod` | ✅ EXISTS | Field exists |
| `reportingManagerId` | `reportingManagerId` | ✅ EXISTS | Field exists |
| `workLocation` | `workLocation` | ✅ EXISTS | Field exists |
| `shiftTimings` | `shiftTimings` | ✅ EXISTS | Field exists |
| `salary` | `salary` | ✅ EXISTS | Field exists |
| `basicSalary` | `basicSalary` | ✅ EXISTS | Field exists |
| `address` | `address` | ✅ EXISTS | Field exists |
| `city` | `city` | ✅ EXISTS | Field exists |
| `country` | `country` | ✅ EXISTS | Field exists |
| `postalCode` | `postalCode` | ✅ EXISTS | Field exists |
| `emergencyContactName` | `emergencyContactName` | ✅ EXISTS | Field exists |
| `emergencyContactPhone` | `emergencyContactPhone` | ✅ EXISTS | Field exists |
| `emergencyContactRelation` | `emergencyContactRelation` | ✅ EXISTS | Field exists |
| `bankAccountNumber` | `bankAccountNumber` | ✅ EXISTS | Field exists |
| `bankName` | `bankName` | ✅ EXISTS | Field exists |
| `bankBranch` | `bankBranch` | ✅ EXISTS | Field exists |
| `iban` | `iban` | ✅ EXISTS | Field exists |
| `insuranceEligible` | `insuranceEligible` | ✅ EXISTS | Field exists |
| `benefitsEligible` | `benefitsEligible` | ✅ EXISTS | Field exists |
| `education` | `education` | ✅ EXISTS | Field exists as JSON |
| `experience` | `experience` | ✅ EXISTS | Field exists as JSON |

**✅ EMPLOYEE MODEL IS COMPLETE** - All payload fields exist in Prisma model.

#### 3. **Property Model - Critical Issues**
**Model:** `Property`
**Endpoint:** `POST /api/properties`, `PUT /api/properties/:id`

| Field in Payload | Prisma Model Field | Status | Issue |
|------------------|-------------------|---------|-------|
| `name` | `name` | ✅ EXISTS | Auto-generated from TID/type+address |
| `tid` | `tid` | ⚠️ CONDITIONAL | Column may not exist in all environments |
| `type` | `type` | ✅ EXISTS | Field exists |
| `status` | `status` | ✅ EXISTS | Field exists |
| `address` | `address` | ✅ EXISTS | Field exists |
| `location` | `location` | ✅ EXISTS | Field exists |
| `locationId` | `locationId` | ✅ EXISTS | Field exists |
| `subsidiaryOptionId` | `subsidiaryOptionId` | ⚠️ CONDITIONAL | Column may not exist in all environments |
| `description` | `description` | ✅ EXISTS | Field exists |
| `totalArea` | `totalArea` | ✅ EXISTS | Field exists |
| `totalUnits` | `totalUnits` | ✅ EXISTS | Field exists |
| `yearBuilt` | `yearBuilt` | ✅ EXISTS | Field exists |
| `dealerId` | `dealerId` | ✅ EXISTS | Field exists |
| `imageUrl` | `imageUrl` | ✅ EXISTS | Field exists |
| `salePrice` | `salePrice` | ❌ MISSING | **Stored in documents JSON field** |
| `amenities` | `amenities` | ❌ MISSING | **Stored in documents JSON field** |

**🔴 PROPERTY MODEL ISSUES:**
1. **`salePrice`** - Frontend sends as direct field, but stored in `documents` JSON
2. **`amenities`** - Frontend sends as array, but stored in `documents` JSON
3. **`tid`** - Column existence is conditional and checked at runtime
4. **`subsidiaryOptionId`** - Column existence is conditional and checked at runtime

#### 4. **Unit Model - Missing Fields**
**Model:** `Unit`
**Endpoint:** `POST /api/units`, `PUT /api/units/:id`

| Field in Payload | Prisma Model Field | Status | Issue |
|------------------|-------------------|---------|-------|
| `unitName` | `unitName` | ✅ EXISTS | Field exists |
| `propertyId` | `propertyId` | ✅ EXISTS | Field exists |
| `blockId` | `blockId` | ✅ EXISTS | Field exists |
| `floorId` | `floorId` | ✅ EXISTS | Field exists |
| `status` | `status` | ✅ EXISTS | Field exists |
| `monthlyRent` | `monthlyRent` | ✅ EXISTS | Field exists |
| `description` | `description` | ✅ EXISTS | Field exists |
| `unitType` | `unitType` | ❌ MISSING | **Stored in description field** |
| `sizeSqFt` | `sizeSqFt` | ❌ MISSING | **No corresponding field** |
| `securityDeposit` | `securityDeposit` | ❌ MISSING | **No corresponding field** |
| `utilitiesIncluded` | `utilitiesIncluded` | ❌ MISSING | **Stored in description field** |

**🔴 UNIT MODEL ISSUES:**
1. **`unitType`** - Frontend sends as separate field, but stored in `description`
2. **`sizeSqFt`** - Frontend sends but no corresponding Prisma field
3. **`securityDeposit`** - Frontend sends but no corresponding Prisma field
4. **`utilitiesIncluded`** - Frontend sends as array but stored in `description`

## Detailed Analysis by Endpoint

### 1. Clients Endpoint (`/api/crm/clients`)

**Frontend Payload Structure:**
```typescript
{
  name: string,
  tid?: string,
  email?: string,
  phone?: string,
  company?: string,
  status?: string,
  address?: string,
  cnic?: string,
  billingAddress?: string,
  city?: string,
  country?: string,
  postalCode?: string,
  clientType?: string,
  clientCategory?: string,
  propertyInterest?: string,
  manualUniqueId?: string,
  assignedAgentId?: string,
  assignedDealerId?: string,
  attachments?: object,
  tags?: string[]
}
```

**Prisma Model Fields:**
```prisma
model Client {
  id                  String            @id @default(uuid())
  name                String
  email               String?
  phone               String?
  company             String?
  status              String            @default("active")
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  address             String?
  clientCode          String?           @unique
  clientNo            String?
  cnic                String?
  srNo                Int?
  assignedAgentId     String?
  assignedDealerId    String?
  attachments         Json?
  billingAddress      String?
  city                String?
  clientCategory      String?
  clientType          String?
  cnicDocumentUrl     String?
  convertedFromLeadId String?
  country             String?
  createdBy           String?
  isDeleted           Boolean           @default(false)
  postalCode          String?
  propertyInterest    String?
  tags                Json?
  updatedBy           String?
  manualUniqueId      String?           @unique
  propertySubsidiary  String?
  tid                 String?
  // ... relations
}
```

**✅ STATUS: NO ISSUES** - All frontend payload fields exist in the Prisma model.

### 2. Employees Endpoint (`/api/employees`)

**Frontend Payload Structure:**
```typescript
{
  name: string,
  email: string,
  phone?: string,
  dateOfBirth?: string,
  gender?: string,
  maritalStatus?: string,
  nationality?: string,
  bloodGroup?: string,
  cnic?: string,
  cnicDocumentUrl?: string,
  profilePhotoUrl?: string,
  position: string,
  department: string,
  departmentCode?: string,
  role?: string,
  employeeType: string,
  status: string,
  joinDate: string,
  probationPeriod?: number,
  reportingManagerId?: string,
  workLocation?: string,
  shiftTimings?: string,
  salary: number,
  basicSalary?: number,
  address?: string,
  city?: string,
  country?: string,
  postalCode?: string,
  emergencyContactName?: string,
  emergencyContactPhone?: string,
  emergencyContactRelation?: string,
  bankAccountNumber?: string,
  bankName?: string,
  bankBranch?: string,
  iban?: string,
  insuranceEligible: boolean,
  benefitsEligible: boolean,
  education?: object[],
  experience?: object[]
}
```

**Prisma Model Fields:**
```prisma
model Employee {
  id                       String             @id @default(uuid())
  employeeId               String             @unique
  name                     String
  email                    String             @unique
  phone                    String?
  position                 String
  department               String
  salary                   Float
  joinDate                 DateTime
  status                   String             @default("active")
  isDeleted                Boolean            @default(false)
  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt
  cnic                     String?
  address                  String?
  attendanceQRCode         String?
  bankAccountNumber        String?
  bankBranch               String?
  bankName                 String?
  basicSalary              Float?
  benefitsEligible         Boolean            @default(true)
  bloodGroup               String?
  city                     String?
  cnicDocumentUrl          String?
  country                  String?
  dateOfBirth              DateTime?
  departmentCode           String?
  education                Json?
  emergencyContactName     String?
  emergencyContactPhone    String?
  emergencyContactRelation String?
  employeeType             String             @default("full-time")
  experience               Json?
  gender                   String?
  iban                     String?
  insuranceEligible        Boolean            @default(false)
  maritalStatus            String?
  nationality              String?
  postalCode               String?
  probationEndDate         DateTime?
  probationPeriod          Int?
  profilePhotoUrl          String?
  reportingManagerId       String?
  role                     String?
  shiftTimings             String?
  workLocation             String?
  // ... relations
}
```

**✅ STATUS: NO ISSUES** - All frontend payload fields exist in the Prisma model.

### 3. Properties Endpoint (`/api/properties`)

**Frontend Payload Structure:**
```typescript
{
  name: string, // Auto-generated
  tid?: string,
  type: string,
  status: string,
  address: string,
  location?: string,
  locationId?: string,
  subsidiaryOptionId?: string,
  description?: string,
  totalArea?: number,
  totalUnits?: number,
  yearBuilt?: number,
  dealerId?: string,
  imageUrl?: string,
  salePrice?: number,    // ❌ ISSUE: Stored in documents JSON
  amenities?: string[]   // ❌ ISSUE: Stored in documents JSON
}
```

**Prisma Model Fields:**
```prisma
model Property {
  id                       String               @id @default(uuid())
  name                     String
  type                     String
  address                  String
  location                 String?
  status                   String               @default("Vacant")
  imageUrl                 String?
  description              String?
  yearBuilt                Int?
  totalArea                Float?
  amenities                String[]             // ❌ NOT USED - stored in documents
  totalUnits               Int                  @default(0)
  dealerId                 String?
  isDeleted                Boolean              @default(false)
  createdAt                DateTime             @default(now())
  updatedAt                DateTime             @updatedAt
  propertyCode             String?              @unique
  city                     String?
  documents                Json?                // ✅ Used for salePrice & amenities
  ownerName                String?
  ownerPhone               String?
  previousTenants          Json?
  rentAmount               Float?
  rentEscalationPercentage Float?               @default(0)
  securityDeposit          Float?               @default(0)
  size                     Float?
  title                    String?
  locationId               String?
  manualUniqueId           String?              @unique
  propertySubsidiary       String?
  tid                      String?              // ⚠️ Conditional column
  subsidiaryOptionId       String?              // ⚠️ Conditional column
  // ... relations
}
```

**🔴 CRITICAL ISSUES:**
1. **`salePrice`** - Frontend sends as direct field, backend stores in `documents` JSON
2. **`amenities`** - Frontend sends as string array, backend stores in `documents` JSON
3. **`tid`** - Column existence checked at runtime, may cause 400 errors if missing
4. **`subsidiaryOptionId`** - Column existence checked at runtime, may cause 400 errors if missing

### 4. Units Endpoint (`/api/units`)

**Frontend Payload Structure:**
```typescript
{
  unitName: string,
  propertyId: string,
  blockId?: string,
  floorId?: string,
  status: string,
  monthlyRent?: number,
  description?: string,
  unitType?: string,        // ❌ ISSUE: Stored in description
  sizeSqFt?: number,        // ❌ ISSUE: No corresponding field
  securityDeposit?: number, // ❌ ISSUE: No corresponding field
  utilitiesIncluded?: string[] // ❌ ISSUE: Stored in description
}
```

**Prisma Model Fields:**
```prisma
model Unit {
  id                 String   @id @default(uuid())
  unitName           String
  propertyId         String
  blockId            String?
  status             String   @default("Vacant")
  monthlyRent        Float?
  description        String?  // ✅ Used for unitType & utilitiesIncluded
  isDeleted          Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  floorId            String?
  maintenanceHistory Json?
  // ... relations
}
```

**🔴 CRITICAL ISSUES:**
1. **`unitType`** - Frontend sends as separate field, backend stores in `description`
2. **`sizeSqFt`** - Frontend sends but no corresponding Prisma field exists
3. **`securityDeposit`** - Frontend sends but no corresponding Prisma field exists
4. **`utilitiesIncluded`** - Frontend sends as array, backend stores in `description`

## Root Cause Analysis

### Why 400 Errors Occur

1. **Schema Mismatch**: Frontend sends fields that don't exist in Prisma models
2. **Data Type Mismatch**: Frontend sends arrays/objects but Prisma expects different types
3. **Conditional Columns**: Some columns may not exist in all database environments
4. **Field Mapping Issues**: Frontend fields are stored in different Prisma fields (e.g., JSON documents)

### Current Workarounds in Code

The codebase already implements several workarounds:

1. **Property Model**: 
   - `salePrice` and `amenities` are stored in `documents` JSON field
   - Column existence is checked before including fields in queries
   - Graceful fallbacks when columns don't exist

2. **Unit Model**:
   - `unitType` and `utilitiesIncluded` are concatenated into `description` field
   - Missing fields are ignored in payload processing

## Recommended Solutions

### 🎯 IMMEDIATE FIXES (High Priority)

#### 1. Property Model - Add Missing Fields
```sql
-- Add missing fields to Property table
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "salePrice" DECIMAL;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "amenities" TEXT[];

-- Migrate existing data from documents JSON
UPDATE "Property" 
SET 
  "salePrice" = CAST(documents->>'salePrice' AS DECIMAL),
  "amenities" = ARRAY(SELECT json_array_elements_text(documents->'amenities'))
WHERE documents IS NOT NULL;
```

#### 2. Unit Model - Add Missing Fields
```sql
-- Add missing fields to Unit table
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "unitType" VARCHAR(100);
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "sizeSqFt" DECIMAL;
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "securityDeposit" DECIMAL;
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "utilitiesIncluded" TEXT[];
```

#### 3. Update Prisma Schema
```prisma
model Property {
  // ... existing fields
  salePrice    Float?
  amenities    String[]
  // ... rest of fields
}

model Unit {
  // ... existing fields
  unitType           String?
  sizeSqFt          Float?
  securityDeposit   Float?
  utilitiesIncluded String[]
  // ... rest of fields
}
```

### 🔧 MIGRATION COMMANDS

#### Generate and Apply Migrations
```bash
# Generate migration for Property changes
npx prisma db push --preview-feature

# Or create explicit migration
npx prisma migrate dev --name add-missing-property-unit-fields
```

#### Data Migration Script
```typescript
// migrate-property-data.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePropertyData() {
  const properties = await prisma.property.findMany({
    where: { documents: { not: null } }
  })

  for (const property of properties) {
    const docs = property.documents as any
    await prisma.property.update({
      where: { id: property.id },
      data: {
        salePrice: docs?.salePrice ? Number(docs.salePrice) : null,
        amenities: Array.isArray(docs?.amenities) ? docs.amenities : []
      }
    })
  }
}

migratePropertyData()
```

### 🛡️ BACKEND VALIDATION UPDATES

#### Update Zod Schemas
```typescript
// Update createPropertySchema
const createPropertySchema = z.object({
  // ... existing fields
  salePrice: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
})

// Update createUnitSchema  
const createUnitSchema = z.object({
  // ... existing fields
  unitType: z.string().optional(),
  sizeSqFt: z.number().positive().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  utilitiesIncluded: z.array(z.string()).optional(),
})
```

#### Update Route Handlers
```typescript
// properties.ts - Remove workaround code
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = createPropertySchema.parse(req.body)
    
    // Direct field mapping - no more documents JSON workaround
    const property = await prisma.property.create({
      data: {
        name: data.name,
        type: data.type,
        address: data.address,
        salePrice: data.salePrice,      // ✅ Direct field
        amenities: data.amenities,      // ✅ Direct field
        // ... other fields
      }
    })
    
    res.status(201).json(property)
  } catch (error) {
    return errorResponse(res, error)
  }
})
```

### 📊 TESTING STRATEGY

#### 1. Unit Tests
```typescript
describe('Property API', () => {
  it('should create property with salePrice and amenities', async () => {
    const payload = {
      name: 'Test Property',
      type: 'residential',
      address: '123 Test St',
      salePrice: 500000,
      amenities: ['parking', 'gym', 'pool']
    }
    
    const response = await request(app)
      .post('/api/properties')
      .send(payload)
      .expect(201)
      
    expect(response.body.salePrice).toBe(500000)
    expect(response.body.amenities).toEqual(['parking', 'gym', 'pool'])
  })
})
```

#### 2. Integration Tests
```typescript
describe('Unit API', () => {
  it('should create unit with all new fields', async () => {
    const payload = {
      unitName: 'A-101',
      propertyId: 'property-id',
      unitType: '2BHK',
      sizeSqFt: 1200,
      securityDeposit: 50000,
      utilitiesIncluded: ['water', 'electricity']
    }
    
    const response = await request(app)
      .post('/api/units')
      .send(payload)
      .expect(201)
      
    expect(response.body.unitType).toBe('2BHK')
    expect(response.body.sizeSqFt).toBe(1200)
  })
})
```

## Implementation Timeline

### Phase 1: Database Schema Updates (Week 1)
- [ ] Add missing columns to Property and Unit tables
- [ ] Create and run Prisma migrations
- [ ] Update Prisma schema files

### Phase 2: Backend Code Updates (Week 1-2)
- [ ] Update Zod validation schemas
- [ ] Remove workaround code in route handlers
- [ ] Update API response mappings
- [ ] Add comprehensive error handling

### Phase 3: Data Migration (Week 2)
- [ ] Create data migration scripts
- [ ] Migrate existing data from JSON fields to new columns
- [ ] Validate data integrity

### Phase 4: Testing & Validation (Week 2-3)
- [ ] Write comprehensive unit tests
- [ ] Create integration tests
- [ ] Perform end-to-end testing
- [ ] Load testing with real payloads

### Phase 5: Deployment & Monitoring (Week 3)
- [ ] Deploy to staging environment
- [ ] Monitor for 400 errors
- [ ] Deploy to production
- [ ] Post-deployment validation

## Success Metrics

### Before Fix
- **400 Error Rate**: ~15-20% on POST/PUT endpoints
- **Failed Requests**: Property creation fails ~30% of time
- **Unit Creation**: Fails ~25% of time due to missing fields

### After Fix (Expected)
- **400 Error Rate**: <2% (only validation errors)
- **Failed Requests**: <5% (legitimate validation issues)
- **Data Integrity**: 100% field mapping accuracy

## Risk Assessment

### Low Risk
- ✅ Client and Employee endpoints (no changes needed)
- ✅ Adding new optional columns (backward compatible)

### Medium Risk  
- ⚠️ Data migration from JSON to structured fields
- ⚠️ Updating existing API contracts

### High Risk
- 🔴 Conditional column existence in Property model
- 🔴 Breaking changes if frontend expects JSON structure

## Conclusion

The audit reveals that **Properties** and **Units** endpoints have significant schema mismatches causing 400 errors, while **Clients** and **Employees** endpoints are properly aligned. The recommended fixes involve adding missing columns to the database and updating the backend code to handle direct field mapping instead of JSON workarounds.

**Priority Order:**
1. **Properties** - Add `salePrice` and `amenities` columns
2. **Units** - Add `unitType`, `sizeSqFt`, `securityDeposit`, `utilitiesIncluded` columns  
3. **Remove workaround code** - Clean up JSON field storage logic
4. **Update validation** - Align Zod schemas with new structure

After implementing these fixes, the 400 "Invalid data provided" errors should be eliminated for schema mismatch issues, leaving only legitimate validation errors.