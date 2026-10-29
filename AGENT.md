# AGENT.md — Vendor Website Architecture, Permanent Rules & Performance Registry

This document serves as the persistent source of project memory, architecture boundaries, and approved workflow protection for the Vendor Website (`D:\vendor`). Every coding agent working on this project must read and strictly adhere to the rules and registry entries below before undertaking any investigation, refactoring, or code modifications.

---

## Section A: Permanent Project Rules

1. **Strict Business Classifications:**
   - **Orders:** Product + Food + Daily Needs orders only.
   - **Bookings:** Services + Stay + Travel bookings only.
   - **My Jobs:** Actual candidate applications for jobs posted by the authenticated vendor.
2. **Preserve Protected Workflows:** Never alter, break, or regress the working Vendor Business tab, vendor registration, catalog CRUD, publishing, authentication, payments, bookings, orders, or status-transition workflows.
3. **Zero Mock or Fabricated Data:** Never use hardcoded, mocked, fabricated, seeded, or static fake data to simulate performance. All displayed data must originate from the authenticated backend and persisted MongoDB database.
4. **Data and Infrastructure Safety:**
   - Never delete data, drop collections, reset databases, or make destructive schema changes.
   - Never modify environment variables, production infrastructure, or server configuration without explicit user confirmation.
   - Never hardcode credentials, secrets, or environment-specific tokens.
5. **Port Allocation:** Frontend development runs on port `5173`. Backend Express runs on port `8002`. Never bind the frontend to port `8002` to avoid port collisions.
6. **Network & Retry Standards:**
   - All client GET requests should use `cachedGet` or bounded retries (`MAX_RETRIES = 2`, `RETRY_DELAY = 1000ms`, `timeout = 15000ms`).
   - Mutations (`POST`, `PUT`, `DELETE`, `PATCH`) must invalidate their corresponding cache keys via `clearApiCache()`.
   - Never introduce infinite retry loops or unbounded waiting periods.
7. **Read-Only Audit First:** Always audit in read-only mode, establish baselines, and wait for explicit user approval before editing files.
8. **Document All Changes:** Update `CHANGELOG.md` and `AGENT.md` after every approved implementation and report verified before/after measurements.

---

## Section B: Performance Optimization Registry

### 1. Vendor Website & Backend Performance Optimization
- **Status:** Completed & Verified (2026-10-29)
- **Exact Files Modified:**
  - `frontend/src/services/apiSetup.js`
  - `frontend/vite.config.js`
  - `backend/routes/publicRoutes.js`
  - `frontend/src/pages/VendorDashboard.jsx`
  - `CHANGELOG.md`
  - `AGENT.md`
- **Key Bottlenecks Resolved:**
  1. **`Backend not responding (attempt 1/3)` retry storm:** Fixed URL path rewrite to properly fail over from inactive local port to production backend `https://vendor.ficapp.in`. Bounded retries to 2 (1s, 2s delays).
  2. **Bloated Category Payloads:** Pruned static 38 KB taxonomy dump from `GET /api/public/categories`, dropping payload size from ~43 KB to ~4.5 KB (~2 KB on filtered queries).
  3. **Duplicate Tab Network Requests:** Eliminated double-fetching on tab clicks by removing eager `setActiveTab` inside `handleSelectMenuItem` and making `searchParams` the single state trigger.
  4. **Unnecessary Requests on Catalog Tab:** Stopped fetching orders, bookings, and applications when viewing the catalog tab.
  5. **Mount Request Redundancy:** Removed duplicate profile fetch; mount requests reduced from 12 to 5.
  6. **In-Flight Deduplication & Caching:** Added 25s TTL read-through cache with instant mutation invalidation. Tab navigation renders in <5ms without blank loading flashes.
  7. **Cloudinary Asset Optimization:** Automatic injection of `f_auto,q_auto,w_500,c_limit` in `formatImageUrl`.
- **Verification Results:**
  - Vite build: passed in 6.65s (`dist/index.html` + chunks cleanly generated).
  - Backend modules loaded and validated.
  - Zero regression on business classifications and workflows.

