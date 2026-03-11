# Audit Report: Real Estate ERP System

**Date:** 2025-12-23
**Auditor:** Senior Full-Stack Engineer / QA Lead
**Scope:** Frontend (Next.js), Backend (Node/Express), Database (Prisma/PostgreSQL)

---

## 🚨 Critical Issues

### 1. Broken Pagination in Properties Module (Data Loss Risk)
*   **File:** `server/src/routes/properties.ts` (Lines 86-103) & `components/properties/properties-view.tsx` (Line 152) & `lib/api.ts` (Line 489)
*   **Severity:** **CRITICAL**
*   **Root Cause:**
    *   Backend `GET /api/properties` expects `page` and `limit` query parameters. If missing, it defaults to `page=1, limit=10`.
    *   Frontend `apiService.properties.getAll()` does **not** accept or pass pagination parameters.
    *   Frontend `PropertiesView` calls `getAll()` once on mount.
*   **Impact:** Users can **only see the first 10 properties**. There is no way to view property #11+. This effectively hides data from the user.
*   **Fix:**
    1.  Update `lib/api.ts` to accept `page` and `limit`.
    2.  Update `PropertiesView` to manage pagination state and pass it to the API.
    3.  Add Pagination UI (Next/Prev buttons) to `PropertiesView`.

### 2. Suspicious External "Spyware" Call
*   **File:** `server/src/routes/properties.ts` (Line 203)
*   **Severity:** **CRITICAL**
*   **Root Cause:**
    ```typescript
    fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43', ...)
    ```
    This code attempts to send data to a local agent (`127.0.0.1:7242`). This looks like leftover debug code or potential data exfiltration (if the IP were external). It runs on *every* property list request.
*   **Impact:** Security risk, performance degradation, console errors if the service isn't running.
*   **Fix:** **Delete this line immediately.**

### 3. Duplicate Route Logic & Ambiguity
*   **File:** `server/src/routes/properties.ts` vs `server/src/routes/properties-enhanced.ts`
*   **Severity:** **HIGH**
*   **Root Cause:** Two sets of routes exist for properties (`/api/properties` and `/api/properties-enhanced`). They duplicate logic but have different implementations (e.g., `properties-enhanced` has better RBAC).
*   **Impact:** Maintenance nightmare. Fixing a bug in one file leaves it in the other. Frontend usage is split or ambiguous.
*   **Fix:** Consolidate logic. For now, ensure `properties.ts` (the active route) is robust.

---

## ⚠️ High Priority Issues

### 4. Unbounded Queries in Finance Module
*   **File:** `server/src/routes/finance.ts` (Line 107)
*   **Severity:** **HIGH**
*   **Root Cause:** `router.get('/accounts')` uses `prisma.account.findMany()` with **no pagination**.
*   **Impact:** If the Chart of Accounts grows (e.g., automatic sub-account creation), this endpoint will become slow and eventually crash the server (OOM).
*   **Fix:** Implement pagination or a hard limit (e.g., `take: 1000`).

### 5. Inefficient Database Column Checks
*   **File:** `server/src/routes/properties.ts` (Lines 17-33, 198-200)
*   **Severity:** **MEDIUM**
*   **Root Cause:** The code queries `information_schema` to check for `tid` and `subsidiaryOptionId` columns on **every request**.
*   **Impact:** Unnecessary database load. Schema should be consistent across environments via Migrations.
*   **Fix:** Remove runtime schema checks. Rely on Prisma schema consistency.

---

## 📉 Medium/Low Issues

### 6. Inconsistent Error Handling
*   **File:** `lib/api.ts`
*   **Severity:** **MEDIUM**
*   **Root Cause:** The Axios interceptor has complex logic for 401/403 but swallows some errors or logs them to console only.
*   **Fix:** Standardize error propagation so UI can show friendly messages.

### 7. Missing UI States
*   **File:** `components/properties/properties-view.tsx`
*   **Severity:** **LOW**
*   **Root Cause:** "Empty" state is generic. No specific "Error" state UI (just an alert).
*   **Fix:** Add proper `<EmptyState>` and `<ErrorState>` components.

---

## ✅ Planned Fixes (Immediate)

1.  **Remove Spyware:** Delete `fetch` call in `properties.ts`.
2.  **Fix Properties Pagination:**
    *   Update `lib/api.ts` to support pagination.
    *   Update `PropertiesView` to implement pagination.
3.  **Optimize Properties Route:** Remove/Optimize column checks.
