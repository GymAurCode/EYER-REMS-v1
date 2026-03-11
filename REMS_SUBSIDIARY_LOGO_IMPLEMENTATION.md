# REMS Subsidiary Logo Watermark Implementation

## Overview
This document describes the implementation of the REMS feature for managing subsidiaries with logo watermarks in PDF reports.

## Features Implemented

### 1. Database Schema
- **Added `logoPath` field** to `PropertySubsidiary` model in Prisma schema
- **Migration file**: `server/prisma/migrations/20250103000000_add_logo_to_subsidiary/migration.sql`
- Stores file path to logo image in filesystem

### 2. Backend API

#### Subsidiaries Route (`server/src/routes/subsidiaries.ts`)
- **POST `/api/subsidiaries`**: Create subsidiary with logo upload
  - Supports both FormData (multer) and base64 uploads
  - Validates file type (images only) and size (max 5MB)
  - Scans files for viruses using security utilities
  - Stores logo in secure filesystem location
  
- **PUT `/api/subsidiaries/:id`**: Update subsidiary with logo
  - Can update logo independently or with options
  - Same validation and security checks as create

- **GET `/api/subsidiaries`**: Fetch all subsidiaries with logo paths
- **GET `/api/subsidiaries/:id`**: Fetch single subsidiary with logo path

#### Properties Route (`server/src/routes/properties.ts`)
- **Updated to include subsidiary logo** in property responses
- Properties now include:
  ```typescript
  subsidiaryOption: {
    id: string
    name: string
    propertySubsidiary: {
      id: string
      name: string
      logoPath: string | null
    }
  }
  ```

- **GET `/api/properties/report/pdf`**: Generate PDF report with watermarks
  - Accepts `propertyIds` query parameter (array)
  - Generates PDF with subsidiary logo as watermark (opacity 0.08, centered)
  - Each property gets its own page with its subsidiary's logo as watermark

### 3. PDF Generator (`server/src/utils/pdf-generator.ts`)
- **New function**: `generatePropertiesReportPDF()`
- Features:
  - Adds subsidiary logo as watermark on each property page
  - Watermark opacity: 0.08 (8%)
  - Logo centered on page
  - Logo size: 200x200px
  - Handles missing logos gracefully
  - Supports multiple file path formats

### 4. Frontend Components

#### Subsidiary Manager (`components/admin/subsidiary-manager.tsx`)
- **Logo Upload**:
  - File input with preview
  - Max file size: 5MB
  - Accepts: image/* files
  - Preview shown before upload
  - Logo displayed in subsidiary list

- **Logo Update**:
  - Can update logo when editing subsidiary
  - Shows existing logo with option to replace

#### Properties Report Generator (`components/reports/properties-report-pdf.tsx`)
- **New component** for generating PDF reports
- Features:
  - Load all properties
  - Select multiple properties
  - Select all / deselect all
  - Generate PDF with watermarks
  - Shows property details including subsidiary info

## File Structure

```
server/
├── prisma/
│   ├── schema.prisma (updated)
│   └── migrations/
│       └── 20250103000000_add_logo_to_subsidiary/
│           └── migration.sql
├── src/
│   ├── routes/
│   │   ├── subsidiaries.ts (updated)
│   │   └── properties.ts (updated)
│   └── utils/
│       └── pdf-generator.ts (updated)

components/
├── admin/
│   └── subsidiary-manager.tsx (updated)
└── reports/
    └── properties-report-pdf.tsx (new)
```

## API Endpoints

### Subsidiaries
- `POST /api/subsidiaries` - Create with logo (FormData or JSON)
- `PUT /api/subsidiaries/:id` - Update with logo (FormData or JSON)
- `GET /api/subsidiaries` - List all with logos
- `GET /api/subsidiaries/:id` - Get single with logo

### Properties Report
- `GET /api/properties/report/pdf?propertyIds=id1&propertyIds=id2` - Generate PDF

## Usage Examples

### Creating Subsidiary with Logo (Frontend)
```typescript
const formData = new FormData()
formData.append('logo', logoFile)
formData.append('locationId', locationId)
formData.append('options', JSON.stringify(['Phase 1', 'Phase 2']))

await fetch('/api/subsidiaries', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
```

### Generating PDF Report
```typescript
const propertyIds = ['id1', 'id2', 'id3']
const queryParams = new URLSearchParams()
propertyIds.forEach(id => queryParams.append('propertyIds', id))

window.open(`/api/properties/report/pdf?${queryParams.toString()}`)
```

## Security Features
- File type validation (images only)
- File size limits (5MB max)
- Virus scanning before save
- Secure file storage outside web root
- Authentication required for all endpoints
- Admin role required for create/update/delete

## Watermark Implementation
- Opacity: 0.08 (8% - subtle watermark effect)
- Position: Center of page
- Size: 200x200px
- Applied per property page
- Uses PDFKit's opacity feature for transparency

## Database Migration
Run the migration to add the logoPath column:
```bash
cd server
npm run migrate
# or
npx prisma migrate deploy
```

## Testing Checklist
- [ ] Create subsidiary with logo upload
- [ ] Update subsidiary logo
- [ ] View subsidiary with logo preview
- [ ] Create property linked to subsidiary
- [ ] Generate PDF report with watermarks
- [ ] Verify watermark appears on each property page
- [ ] Test with properties without subsidiaries
- [ ] Test with subsidiaries without logos

## Notes
- Logo files are stored in `public/uploads/logos/` directory
- Files are served via secure endpoint `/api/secure-files`
- PDF generation is synchronous (no async operations in PDFKit)
- Watermark is applied before property content is drawn

