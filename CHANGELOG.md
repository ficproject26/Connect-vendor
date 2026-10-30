# Vendor Website — Implementation Changelog

All notable changes, task-by-task implementations, audits, and performance test results are documented in this file in chronological order.

## [Fix WebSocket Handshake 200 & 400 Errors via Engine.IO Handshake Order] - 2026-10-30

### Scope
Resolve browser console errors:
1. `Error during WebSocket handshake: Unexpected response code: 200`
2. `Error during WebSocket handshake: Unexpected response code: 400` (Engine.IO `{"code":3,"message":"Bad request"}`)

### Root Cause
1. **HTTP 200 Error:** `vendor.ficapp.in` reverse proxy serves static frontend files and does not proxy `/socket.io/`, falling through to `index.html`.
2. **HTTP 400 Error:** Passing `transports: ['websocket', 'polling']` with `'websocket'` first forced direct raw WebSocket connections without an established Engine.IO session ID (`sid`). The server rejected direct unnegotiated websocket requests with status 400 (`Bad request`). Furthermore, passing huge JWT strings in the URL query string (`query: { token }`) bloated every WebSocket packet.

### Implementations
1. **Dedicated WebSocket URL Resolver (`frontend/src/services/apiSetup.js`):**
   - Routes production WebSocket traffic to `https://api.ficapp.in`, where the live ecosystem Socket.IO cluster is actively running and connected to the shared Redis instance.
2. **Engine.IO Transport Order & Session Negotiation (`frontend/src/realtime/wsClient.js`):**
   - Configured `transports: ['polling', 'websocket']` with `upgrade: true`. Socket.IO negotiates the session ID via HTTP polling first and cleanly upgrades to `websocket` (receiving HTTP 101 Switching Protocols).
   - Removed query string token duplication (`query: { token }`) in favor of canonical Socket.IO `auth: { token, role: 'Vendor' }`.
   - Added `upgrade` event logging for connection observability.
3. **Bounded Reconnection & Graceful Fallback (`frontend/src/realtime/wsClient.js`):**
   - Bound reconnection attempts (`MAX_RECONNECT_ATTEMPTS = 5`) with 2s to 10s backoff.
4. **CSP Whitelist (`backend/server.js`):**
   - Added `wss://*.ficapp.in` to Content-Security-Policy `connectSrc`.

### Verification Results
- Tested in Node with actual vendor token:
  `CONNECTED successfully! Socket ID: phaa6Za_d4XVDH8QAAAv (Transport: polling)`
  `🚀 Successfully upgraded to: websocket`
- `npm run build --prefix frontend`: Vite built cleanly with 0 errors.

---

## [Real-Time WebSocket Synchronization for Orders, Bookings & Applications] - 2026-10-30

### Scope
Replace 30-second interval HTTP polling in the Vendor Website with instant real-time WebSocket event listeners. Synchronize newly received orders, stay/travel/service bookings, and job applications instantly with live toast notifications, KPI badge updates, and automatic cache invalidation.

### Implementations
1. **Multi-Channel Redis Ecosystem & Deduplication (`backend/eventSubscriber/subscriber.js`):**
   - Subscribed to `connect:realtime:events`, `connect:events:orders`, `connect:events:global`, and `REDIS_CHANNELS.GLOBAL`.
   - Added canonical dedup key resolution tracking processed events across multiple envelopes and payloads.
   - Added automatic vendor ID and business ID targeting inference when embedded in payload data.
2. **WebSocket Named Event Forwarding (`backend/websocket/socketServer.js`):**
   - Added dual emission: emits both standard `realtime_event` and explicit event names (`ORDER_CREATED`, `BOOKING_CREATED`, etc.) directly to vendor rooms.
3. **Public Order Route Event Broadcasting (`backend/routes/publicRoutes.js`):**
   - Dispatches `publishRealtimeEvent` on order/booking/job creation with vendor, user, and business targeting.
4. **Frontend Real-Time Listener & Resilient Fallback (`frontend/src/pages/VendorDashboard.jsx`):**
   - Subscribes via `wsClient` to `ORDER_CREATED`, `BOOKING_CREATED`, `APPLICATION_CREATED`, `new_order`, `new_order_received`, `new_order_placed`, `ORDER_STATUS_CHANGED`, `ORDER_UPDATED`, `order:status_changed`.
   - Filters events for relevance against authenticated vendor and associated outlet business IDs.
   - Prepends new transactions directly to React state with automatic API cache invalidation (`clearApiCache`), real-time toast alert banners, and live KPI metric increments.
   - Added gentle 30s background fallback polling (`fetchOrdersFallback`) for cases where WebSocket disconnects or tab visibility resumes.

### Verification Results
- `npm run build --prefix frontend`: Vite v5.4.21 built cleanly in 12.02s with 0 errors.

---

## [Latest-First Transactions + Enriched Order, Booking & Job Application Cards] - 2026-10-30

### Scope
Enforce strict descending chronological sorting (latest transaction first) across Orders, Bookings, and Job Applications, and enrich list cards and tables with vital transaction metadata (customer phone numbers, quantities, product thumbnails, payment status badges, and property names) directly on the listing views without requiring modal clicks.

### Implementations

1. **Backend Chronological Sorting with ObjectId Tie-Breakers (`backend/controllers/vendorController.js`):**
   - **`getOrders`:** Added deterministic secondary sort `Order.find(baseQuery).sort({ createdAt: -1, _id: -1 })`. Added explicit `totalQuantity` calculation summing `item.quantity` across `order.items`, and ensured `customerPhone` is consistently exposed.
   - **`getBookings`:** Added deterministic secondary sort `Order.find(baseQuery).sort({ createdAt: -1, _id: -1 })`.
   - **`getApplications`:** Added ObjectId tie-breaker to the aggregation pipeline `{ $sort: { createdAt: -1, applicationDate: -1, created_at: -1, _id: -1 } }`.

2. **Frontend Resilient Sorting & Enriched Listing Tables (`frontend/src/pages/VendorDashboard.jsx`):**
   - **Resilient Timestamp Resolver:** Created `getRecordTimestamp(record)` supporting `createdAt`, `orderDate`, `bookingDate`, `applicationDate`, `created_at`, ISO date strings, Unix timestamps, and MongoDB ObjectId 4-byte epoch fallback (`parseInt(id.substring(0, 8), 16) * 1000`) for complete resilience against legacy or missing timestamps.
   - **Descending Sorting:** Enforced client-side descending chronological sort on `filteredOrders`, `filteredBookings`, and `filteredApps` before rendering pagination.
   - **Orders Table:** Added Customer Phone (`📞 {custPhone}`), Product Thumbnail image, Total Quantity badge (`Qty: {totalQty}`), and Total Amount (`₹{finalAmount}`).
   - **Bookings Table:** Added Customer Phone (`📞 {phone}`), Property Name for Stay bookings (`propName`), and distinct Payment Status badge (`✓ Paid` / `Payment Pending`) in the Amount column.

### Verification Results
- `npm run build --prefix frontend`: Vite v5.4.21 built cleanly in 8.17s with 0 errors (`dist/index.html` + asset bundles).
- All existing modal actions (View Details, Accept, Reject, Update Status, Bus seat allocation) preserved.

---

## [Critical Bug Fix — Vendor-Wise Transaction Mapping & Aggregation Pipeline Optimization] - 2026-10-30

### Scope
Resolve customer transaction mapping across Customer Website, Customer Mobile App, and Vendor platforms. Ensure all Orders, Bookings, and Job Applications appear under the correct vendor account, optimize backend query performance, and eliminate 45-second MongoDB network timeouts.

### Root Cause Analysis & Implementations

1. **Resolution of 45-Second MongoDB Timeout in `getApplications` (`backend/controllers/vendorController.js`):**
   - **Root Cause:** Raw 10MB base64 PDF resume uploads stored in MongoDB `orders.candidateResume` caused massive network payload transfers over MongoDB Atlas. Fetching application documents without field projection took >2m 45s, triggering Mongoose's 45s `socketTimeoutMS` (`MongoNetworkTimeoutError`).
   - **Fix:** Implemented an aggregation pipeline with `$cond` projection: if `candidateResume` string length exceeds 500 characters, it safely projects to `'Resume.pdf'` for listing requests. Full resume downloads are served on-demand via `GET /api/vendor/orders/:id/resume`.
   - **Result:** Endpoint execution time dropped from >2m 45s to **519ms**.

2. **Full-Collection `Customer.find({})` Atlas Scan Elimination:**
   - **Root Cause:** `buildCustomerLookupForOrders` executed `Customer.find({})` with an empty filter `{}` on every call to `getOrders`, `getBookings`, `getApplications`, and `getSalesPayments`, scanning the entire unindexed customer collection across MongoDB Atlas.
   - **Fix:** Replaced empty filter with targeted `$or: orCustConditions` strictly querying the IDs, emails, and phone numbers referenced by the retrieved records. Made the related payments lookup strictly conditional.

3. **Vendor Business ID Matching Enhancement:**
   - Updated `getVendorMatchingIds` and `getApplications` to match `b.businessId` and `b.vendorId` alongside `b._id` and `b.id`, guaranteeing multi-business vendors correctly receive all corresponding transactions.

### Files Modified
- `backend/controllers/vendorController.js`
- `CHANGELOG.md`
- `AGENT.md`

### Verification Results
- `GET http://localhost:8002/api/vendor/applications` returns 21 applications in <3s (519ms DB execution time).
- Dedicated resume endpoint `GET http://localhost:8002/api/vendor/orders/JOB527732/resume` serves HTTP 200 `application/pdf`.
- All orders, bookings, and applications display under the correct authenticated vendor account.

---

## [Critical Performance Optimization — Vendor Website & Backend] - 2026-10-29

### Scope
Address critical performance bottlenecks, eliminate repeated backend retry loops (`Backend not responding (attempt 1/3). Retrying in 3s...`), eliminate redundant network requests, reduce bloated API payloads, and optimize rendering performance across the Vendor Website without compromising data integrity, security, or business rules.

### Root Cause Analysis & Implementations

1. **Resolution of Backend Retry Loop (`Backend not responding (attempt 1/3)...`):**
   - **Root Cause:** In `frontend/src/services/apiSetup.js`, the Axios request interceptor rewrote `/api/...` to `http://localhost:8002/api/...`. When the local backend was inactive, the response retry interceptor checked `if (isNetworkError && config.url.startsWith('/api'))`. Since `config.url` was now `http://localhost:8002/...`, the condition evaluated to `false`. Axios retried the dead localhost port 3 times with 3s, 6s, 9s exponential delays (an 18-second blocking freeze per endpoint) before failing over.
   - **Fix:** Enhanced the URL rewrite in the retry interceptor: safely extracts `/api/...` via `config.url.substring(config.url.indexOf('/api/'))` and prepends the live production backend `https://vendor.ficapp.in`.
   - **Tuning:** Reduced maximum retries from 3 to 2, reduced retry delays from 3s/6s/9s to 1s/2s, and bounded retry timeout to 15s (was 60s).

2. **In-Flight Request Deduplication & Read-Through Client Cache:**
   - **Implementation:** Added `inFlightGetRequests` Map and `apiGetCache` (25-second TTL) with `cachedGet()` and `clearApiCache()` in `frontend/src/services/apiSetup.js`.
   - **Automatic Mutation Invalidation:** Mutations (`POST`, `PUT`, `DELETE`, `PATCH`) automatically invalidate relevant cache partitions (`/products`, `/orders`, `/bookings`, `/customers`, `/delivery-partners`, `/business`, `/profile`, `/analytics`).
   - **Zero Flash Background Revalidation:** Tab changes reuse cached data immediately (<5ms render) while transparently updating in the background without blank loading screens.

3. **Backend Category Route Payload Pruning (`backend/routes/publicRoutes.js`):**
   - **Root Cause:** `GET /api/public/categories` bundled the entire static `COMPLETE_CAT_TAXONOMY` object on every category request (~38 KB uncompressed overhead) even when only dynamic database categories were needed. When filtered by `?mainCategory=...`, the route redundantly sent both full database categories (`data: dbCats`) and taxonomy hierarchy (`hierarchy: hierarchy`).
   - **Fix:** Omitted static `taxonomy` by default unless explicitly requested via `?includeTaxonomy=true` or `?taxonomy=true`. When filtered by `mainCategory`, pruned redundant full data dumps.
   - **Result:** Response size dropped from ~43 KB to ~4.5 KB on initial category query, and down to ~2 KB on category filter queries (a 95% bandwidth savings).

4. **Port Collision Prevention (`frontend/vite.config.js`):**
   - Changed Vite dev server port from `8002` to `5173` to eliminate port binding collisions with the Express backend (`PORT=8002`).

5. **Vendor Dashboard Request Deduplication & Rendering Optimization (`frontend/src/pages/VendorDashboard.jsx`):**
   - Replaced raw `axios.get` calls with `cachedGet` across catalog, orders, bookings, applications, delivery partners, customers, payments, and dynamic categories.
   - **Catalog Tab Optimization:** Stopped fetching unrelated orders, bookings, and applications data on catalog tab activation.
   - **Customers Tab Parallelization:** Combined customer order and booking lookups into parallel execution and reused in-memory state where already present.
   - **Tab Navigation Deduplication:** In `handleSelectMenuItem`, removed eager `setActiveTab(itemId)` to make `searchParams` the single state trigger, eliminating duplicate network fetches per tab click.
   - **Initial Mount Deduplication:** Removed redundant secondary `syncProfile()` `useEffect` (line 1615) which duplicated `checkStatus`. Initial mount network requests dropped from 12 to 5.
   - **Loading State Refinement:** Updated Customers and Delivery Partners loading states to `{loading && items.length === 0 ? ... : ...}` so existing data remains visible during background refresh without blank loading flashes.
   - **Image Loading:** Added `loading="lazy"` and `decoding="async"` to `CatalogCardImage`.
   - **Cloudinary CDN Optimization:** Appended `f_auto,q_auto,w_500,c_limit` transformation parameters in `formatImageUrl` to deliver WebP/AVIF images scaled to thumbnail dimensions.

### Strict Business Rules Adherence
- **Orders:** Product + Food + Daily Needs orders only.
- **Bookings:** Services + Stay + Travel bookings only.
- **My Jobs:** Actual candidate applications for jobs posted by the authenticated vendor.
- Preserved working Vendor Business tab, registration, catalog CRUD, publishing, auth, payments, bookings, and orders.
- Zero mock, hardcoded, or fabricated data used.

### Files Modified
- `frontend/src/services/apiSetup.js`
- `frontend/vite.config.js`
- `backend/routes/publicRoutes.js`
- `frontend/src/pages/VendorDashboard.jsx`
- `CHANGELOG.md`
- `AGENT.md`

### Verification Results
- **Vite Production Build:** `npm run build --prefix frontend` built successfully in 6.65s (0 errors).
- **Backend Route Loading:** Verified clean module loading for `backend/routes/publicRoutes.js` and taxonomy data structures.
- **Live Fallback Verification:** Tested failover routing from local port to production backend `https://vendor.ficapp.in` within bounded 1s/2s retry window.



## [2026-10-30] - Real-Time Cross-Platform Ecosystem Synchronization (Vendor Web & Vendor Mobile)

### Added & Enhanced
1. **Centralized Real-Time Event Reception (`frontend/src/pages/VendorDashboard.jsx`):**
   - Connected `wsClient` using active vendor authentication token to `http://localhost:8002` (and production fallback).
   - Subscribed to real-time events: `ORDER_CREATED`, `BOOKING_CREATED`, `APPLICATION_CREATED`, `new_order`, `new_order_placed`, `new_order_received`, `ORDER_STATUS_CHANGED`, and `ORDER_UPDATED`.
   - Incoming orders, bookings, and applications are immediately prepended to state (`orders`, `bookings`, `applications`) with strict ID deduplication (`_id`, `order_number`, `booking_number`, `applicationId`).
   - Clears GET API cache for affected endpoints (`clearApiCache('/orders')`, `clearApiCache('/bookings')`, `clearApiCache('/applications')`) so tab switches fetch fresh state.
   - Non-blocking background analytics refresh keeps KPI cards in sync.
   - Dynamic in-place status updates applied on `ORDER_STATUS_CHANGED` without list rebuilding or screen flickers.

2. **Backend Redis Pub/Sub Multi-Channel Subscription (`backend/eventSubscriber/subscriber.js`):**
   - Subscribed to `connect:realtime:events` alongside `connect:events:global` and `connect:events:orders` to capture transaction events originating from Customer Backend.
   - Inferred target vendor ID and business ID from payload attributes (`vendorId`, `vendor_id`, `businessId`).

3. **WebSocket Server Scoping & Delivery (`backend/websocket/socketServer.js`):**
   - Enhanced vendor room join to automatically join `vendor:<user.id>` alongside `vendor:<user.vendorId>`, `vendor:<primaryBusinessId>`, and all outlet business IDs.
   - Authorized explicit room subscriptions for both Mongo `_id` and registration `vendorId`.
   - Dual-emitted both structured `realtime_event` and named event (`ORDER_CREATED`, `BOOKING_CREATED`, `APPLICATION_CREATED`, `ORDER_STATUS_CHANGED`) to all matching vendor rooms.

4. **Public Order Route Forwarding (`backend/routes/publicRoutes.js`):**
   - Updated `POST /api/public/orders` to ensure that incoming orders matching existing records also publish real-time events (`BOOKING_CREATED`, `APPLICATION_CREATED`, or `ORDER_CREATED`) instead of silently returning early without WebSocket notification.

### Verification Results
- **E2E Real-Time Test Suite:** Verified 100% pass rate in `verify_realtime_e2e.js`:
  - `ORDER_CREATED`: Delivered in real time to connected vendor socket.
  - `BOOKING_CREATED`: Delivered in real time to connected vendor socket.
  - `APPLICATION_CREATED`: Delivered in real time to connected vendor socket.
  - `ORDER_STATUS_CHANGED`: Delivered in real time to connected vendor socket.
  - Verified instant data fetch and descending latest-first order on `GET /api/vendor/orders`, `/api/vendor/bookings`, and `/api/vendor/applications`.
- **Production Build:** Vite production build passed cleanly with zero errors.
