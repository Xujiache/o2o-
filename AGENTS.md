<claude-mem-context>
# Memory Context

# [o2o、] recent context, 2026-05-13 12:38am GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (18,099t read) | 1,465,952t work | 99% savings

### May 12, 2026

S49 Implement dedicated coupon selection page with UI for both usable and unavailable coupons (displayed greyed out with reasons), replacing the action sheet modal that only showed "no available coupons" (May 12, 6:17 PM)
S50 Customer app refactoring phase: Clean development markers, integrate user profile management with server, merge account security into profile editing, and fix TypeScript safety issues (May 12, 6:23 PM)
S51 Fix backend API returning 500 errors on customer profile operations (GET/PATCH /api/v1/c/profile) (May 12, 6:57 PM)
293 7:15p 🔴 Fixed: Added missing bio column to customer_profile table
294 " 🔵 Profile endpoint now responds with 401 instead of 500 error
S52 Fixed hideTabBar API errors occurring on non-TabBar pages in customer app (May 12, 7:15 PM)
295 7:29p ✅ Unified admin panel currency and datetime formatting
296 " ✅ Store business status now visible and sortable; offline stores no longer filtered from search
297 7:31p ✅ Product catalog queries no longer reject offline stores; client responsible for UI state
298 7:35p 🟣 Store Resting Status Feature Implementation
299 7:38p 🟣 Store Resting UI and Interaction Guards Implementation
300 7:41p 🟣 Store Resting CSS Styling and Button State Management
301 " 🔵 hideTabBar called on non-TabBar pages causing API failures
302 " 🔵 hideTabBar invoked in onShow lifecycle of coupons.vue
303 7:42p 🔵 hideTabBar pattern repeated in errand home page
304 " 🔴 Removed hideTabBar from coupons.vue to fix API error
305 " ✅ Removed unused onShow import from coupons.vue
306 " ✅ Removed unused onShow import from errand home page
307 " 🔴 Removed hideTabBar from errand home page
S53 Refactor and beautify the O2O rider app's "我的" (me/profile) page to match the workbench design system and add real operational data (May 12, 7:43 PM)
308 7:48p 🟣 Merchant Order Detail Page Refactored with Map Visualization and Actions
309 7:49p ✅ Customer App Status Label Utilities Added
310 7:50p ✅ Rider App Task Status Utilities and Errand Status Labels Standardized
311 7:51p 🟣 Customer Food and Errand Order Detail Pages Refactored with Maps and Actions
312 " 🟣 Rider Task Detail Extended with Pickup and Delivery Location Coordinates
313 8:05p 🔵 O2O Rider App Page Structure and Profile Tab Configuration
314 8:06p 🔵 Profile Page Implementation - Current Structure and Features
315 " 🔵 Workbench Page Implementation - Online Status and Navigation Hub
316 " 🔵 Rider API Structure and Data Types
317 " 🔵 Available SVG Icons in Rider App Component Library
318 8:08p 🟣 Rider Profile Page Complete Redesign and Feature Expansion
S54 Refactor and beautify 5 rider app pages with modern UI patterns: withdrawal form/records, assessment center, violation records, and workbench homepage (May 12, 8:08 PM)
S55 Upload o2o project to GitHub (上传到GitHub) - completed successfully with UI redesign and coupon system release (May 12, 8:23 PM)
324 8:42p 🔵 O2O project has extensive uncommitted changes across four frontend/backend applications
327 " 🔵 Financial Amount Storage Uses Bigint Type for Precision
325 8:43p 🔵 Test/demo JSON files at project root are not covered by .gitignore
326 " ✅ Added .gitignore exclusions for local API response dump files
330 " ✅ Staged 204 files for GitHub commit, including new admin components and coupon feature
328 " 🔵 Financial Transaction Consistency via EntityManager and State Machines
329 " 🔵 Comprehensive Financial Audit Trail via Refund and Settlement Entities
331 " 🔵 Price Snapshot Pattern Freezes Order Economics at Submission Time
337 8:44p 🔵 Repository configured with Husky Git hooks for commit/push automation
332 " 🔵 Consistent Cents-to-Yuan Conversion at UI Layer
333 " 🔵 BigInt Arithmetic Ensures Precision During Price Calculations
334 " 🔵 BigInt Used Comprehensively Across All Financial Calculations
335 " 🔵 Complete Financial System Uses Consistent Bigint/String Type Pattern
336 " 🔵 Three Critical Risk Areas Identified in Financial Logic Implementation
338 8:45p 🔵 Food Order Service Implements Defensive Coupon Discount and Payable Amount Validation
339 " 🔵 Coupon Discount Calculation Semantics Resolved: Type-Dependent Logic with Protective Bounds
343 " 🔴 Payment amount consistency validation in callback handler
344 " 🟣 Available balance computation for withdrawal services
345 " 🟣 Automatic refund generation for late payment callbacks
346 " 🟣 Refund amount validation to prevent over-refunding
340 8:47p 🔄 Removed unused IsString validator import from coupon-customer DTO
341 8:48p 🟣 Deployed major cross-platform UI redesign with coupon system and review reply workflow
342 8:49p ✅ Successfully deployed major release to GitHub main branch
S56 Complete financial payment system controls implementation and test validation - document all fixes applied to prevent money loss through balance validation, refund controls, and payment consistency checks (May 12, 8:49 PM)
S57 Clean up development stage markers and fix backend service constructor/dependency injection mismatches in O2O platform codebase (May 12, 8:57 PM)
347 9:10p 🟣 O2O Customer App Enhancement: Store Avatar Integration, Navigation Removal, and Errand Orders Section Cleanup
S58 Refactor store display logic to include offline/paused stores with proper sorting, add file service integration for shop avatars, and update user-facing UI to show real merchant images (May 12, 9:31 PM)
**Investigated**: Examined test failures in PublicStoreReadonlyService and StoreQueryService revealing mock TypeORM querybuilder incompleteness (missing addOrderBy chain method); reviewed existing store filtering logic that was filtering out non-online stores; analyzed fixture data structure and test expectations

**Learned**: Both services were filtering stores to only show online status (businessStatus='online'), which prevented paused/offline merchant shops from displaying at all. The querybuilder mock in tests was incomplete — missing addOrderBy method stub caused chain breaking. Frontend was using placeholder store avatars instead of actual merchant-uploaded images. Tests needed updates to reflect new business rule: display both online and offline stores, but sort online stores first. File service integration with mock CDN URL resolution is now properly injected into both services.

**Completed**: Fixed querybuilder mock chain with addOrderBy stub in both service specs. Removed businessStatus='online' filter from store lists; now returns all stores from active merchants, sorted by status (online=0, offline=1) then by updatedAt descending. Updated 14 test expectations across two suites to verify correct store ordering and count. Added fileService dependency injection with URL resolution mocks. Modified StoreQueryService and PublicStoreReadonlyService to use real merchant avatar files (avatarFileId → avatarUrl). Frontend store detail page now displays merchant-uploaded images. All 14 unit tests passing; TypeScript typecheck clean.

**Next Steps**: Session indicates plan completion — all targeted backend service refactoring and test fixes are done. Frontend shop avatar integration is complete. Remaining user requirements (search filter bar redesign, real-time hotspots in search box, back button, city selection page reconstruction) appear to be separate UI/UX enhancements not yet started in this session.

Access 1466k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
