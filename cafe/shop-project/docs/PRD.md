# PRD: Restaurant & Ready Meals Online Shop (v1)

**Status:** Draft 1  
**Stack:** Next.js, Supabase (Postgres), Vercel (Hobby/free plan)  
**Version scope:** v1, manual payment via receipt upload (no payment gateway)

## 1. Overview

An online ordering website for a cafe/restaurant selling ready meals. Customers browse the menu, search and filter, choose variants (size, add-ons, etc.), place an order for **pickup from the cafe or home delivery within Malé and Hulhumalé**, and pay by uploading a payment receipt. Staff review receipts and move orders through a defined status flow from an admin dashboard.

### Goals

- Let customers find and order food quickly on mobile and desktop.
- Give the business full control of products, stock, orders and staff access from one dashboard.
- Run on free tiers (Vercel Hobby + Supabase Free) while keeping a clean path to upgrade.
- Be ready to add a payment gateway and the final logo later without rework.

### Non-goals (v1)

- Online payment gateway (card, wallet, etc.)
- Loyalty points, coupons, reviews, wishlists
- Native mobile apps
- Multi-branch / multi-restaurant support
- Automated delivery tracking or driver management

## 2. Users and Roles

| User | Description |
|---|---|
| **Visitor** | Browses menu, searches, filters. No account needed. |
| **Customer (guest)** | Places an order without an account, using name, phone and optional email. |
| **Customer (account)** | Registered user with saved details and order history. |
| **Admin** | Full access, including user management and settings. |
| **Manager** | Manages products, stock, orders and views stats. Cannot manage users or system settings. |
| **Staff** | Day-to-day order handling and stock updates. Limited access. |

### Permission matrix (proposed)

| Capability | Admin | Manager | Staff |
|---|:-:|:-:|:-:|
| View dashboard stats | Yes | Yes | Limited (today's orders only) |
| View products | Yes | Yes | Yes |
| Create / edit / delete products, categories, variants | Yes | Yes | No |
| Update stock quantity / mark out of stock | Yes | Yes | Yes |
| View orders and receipts | Yes | Yes | Yes |
| Approve / reject receipts | Yes | Yes | Yes |
| Mark order Delivered | Yes | Yes | Yes |
| Edit or delete orders | Yes | Yes | No |
| Add / edit / deactivate admin users and roles | Yes | No | No |
| Site settings (bank details, delivery areas, delivery fee) | Yes | Yes (view only) | No |

## 3. Branding and UI

- **Main color:** light green, with a fresh, food-friendly palette.
- **Logo:** temporary free placeholder (a chef-hat or utensils icon from the Lucide icon set, ISC license, paired with the shop name as text). It lives in a single component and a single asset so the real logo can be swapped in one place later.
- **Style:** clean, rounded cards, large food photography, generous spacing, mobile-first.

### Color palette (proposed)

| Role | Color | Hex |
|---|---|---|
| Primary (light green) | Fresh leaf | `#8CC63F` |
| Primary dark (buttons hover, headings) | Deep herb | `#4F8A1E` |
| Primary light (backgrounds, chips) | Mint cream | `#E9F6D8` |
| Page background | Soft cream | `#FAFDF5` |
| Accent (CTAs, badges, sale tags) | Warm carrot | `#F4A03A` |
| Text | Dark forest | `#1F2A1C` |
| Muted text / borders | Sage grey | `#6B7A66` / `#DCE6D2` |
| Success / Error / Warning | | `#3FA34D` / `#D64545` / `#E8B931` |

Order status colors: Pending (grey), Slip Uploaded (amber), Approved (green), Rejected (red), Delivered (deep green/teal).

## 4. Customer-Facing Features

### 4.1 Pages

1. **Home:** hero, featured categories, popular items, order-type info (cafe pickup and delivery to Malé and Hulhumalé), opening hours.
2. **Menu / Shop:** product grid with search and filters.
3. **Product detail:** image gallery, description, variants, price, stock status, add to cart.
4. **Cart:** line items, quantity edit, variant display, subtotal.
5. **Checkout:** customer details, order type, notes, order summary.
6. **Payment / Upload receipt:** bank details, receipt upload, confirmation.
7. **Order tracking:** order status page reachable by link, or by order number plus phone number for guests.
8. **Account (optional):** sign up / login, order history, saved details.
9. **Static pages:** About, Contact, Terms (basic).

### 4.2 Search and filters

- **Search:** by product name, description and category, with typo tolerance (Postgres full-text search plus `pg_trgm`). Debounced as-you-type with a results page.
- **Filters:**
  - Category (multi-select)
  - Price range
  - Availability (in stock only)
  - Tags (e.g. vegetarian, spicy, halal, gluten-free; configurable by admin)
- **Sort:** newest, price low to high, price high to low, name.
- Filters and search are reflected in the URL so results are shareable and work with the back button.
- Pagination or infinite scroll (default 12 to 24 items per load).

### 4.3 Cart and checkout

- Cart persists in the browser for guests and in the database for logged-in users (merged on login).
- **Order types:** Pickup from the cafe or Home delivery (each can be enabled or disabled by admin).
  - Pickup: collect from the cafe at a preferred time.
  - Delivery: Malé and Hulhumalé only; address, area, phone and delivery fee (flat fee or per area, set in settings). Addresses outside these two areas are rejected at checkout.
- Customer fields: name, phone (required), email (optional), notes.
- Stock is validated at checkout. Out-of-stock variants cannot be purchased.
- Guests can check out without an account and are offered to create one afterward.

### 4.4 Receipt upload flow

1. Order is created with status **Pending**. The customer sees the order summary and the business bank/transfer details.
2. Customer uploads a receipt (image or PDF) from the order page.
3. Status changes automatically to **Slip Uploaded**.
4. If the order is **Rejected**, the customer sees the reason and can upload a new receipt, which returns it to **Slip Uploaded**.

## 5. Product Management

### 5.1 Product data

- Name, slug, description, category (one primary, optional extra tags), base price, status (active/draft/archived), featured flag.
- **Images:** multiple per product, one primary, sortable.
- **Variants:** each product can have 0 or more variants (e.g. Small / Medium / Large, or Spicy / Mild). Each variant has its own SKU (optional), price (or price adjustment), stock quantity and image (optional).
- **Stock:** tracked per variant (or per product if no variants). Low-stock threshold with dashboard warning. Option to mark "unlimited / made to order" for items that don't need tracking.
- **Categories:** name, slug, image (optional), sort order, active flag. Supports one level of nesting (category and subcategory) if needed.

### 5.2 Stock rules

- Stock is **deducted when the order is placed** (reserved).
- Stock is **restored** if the order is Rejected and not re-submitted within a set period, or if the order is cancelled by an admin.
- Pending orders with no receipt after a configurable time (default 24 hours) can be flagged or auto-cancelled (see open questions).
- All stock changes are logged (who, when, why).

## 6. Image Handling

### 6.1 Product images (stored in the database, compressed, no visible quality loss)

- Uploaded from the admin product form (JPG, PNG, WebP; max 10 MB source).
- Compression happens **in the browser before upload** to avoid Vercel's serverless request-size limit (about 4.5 MB per request on the free plan).
- Target: lossless or visually lossless output (WebP lossless, or high-quality WebP/JPEG at roughly 90 to 95 quality with metadata stripped). Resolution is capped at a sensible maximum (e.g. 2000 px on the long edge) with no upscaling.
- Two sizes are stored per image: **full** (detail page) and **thumbnail** (grid, around 400 px) so the menu loads quickly.
- Stored in Postgres (`bytea`) in a dedicated `product_images` table, kept separate from the `products` table so product queries stay fast.
- Served through a Next.js route handler with long-lived cache headers and ETags, and through `next/image` or the Vercel CDN cache where possible.

> **Important risk:** Supabase Free gives 500 MB of database space. Storing images in the DB will consume that quickly (roughly 150 to 250 products with several images each can approach the limit). Supabase Storage (1 GB on free) is the usual home for images. The architecture should hide image storage behind one service so it can be switched later without changing the UI.

### 6.2 Payment receipts (compressed)

- Accepted: JPG, PNG, WebP, PDF (max 10 MB source).
- Images are compressed client-side (e.g. max 1600 px, around 70 to 80 quality); readability of text and amounts must be preserved. PDFs are accepted as-is within a size limit.
- Stored privately: only logged-in admin/manager/staff can view, plus the customer who owns the order (via a signed or token-protected link).
- Receipts are never publicly cached.

## 7. Order Management

### 7.1 Statuses

| Status | Meaning | Who/what triggers it |
|---|---|---|
| **Pending** | Order placed, waiting for payment receipt | System, on order creation |
| **Slip Uploaded** | Receipt received, awaiting review | System, on receipt upload |
| **Approved** | Payment verified, order confirmed and being prepared | Admin / Manager / Staff |
| **Rejected** | Receipt invalid or payment not received (reason required) | Admin / Manager / Staff |
| **Delivered** | Order handed over (delivered or picked up) | Admin / Manager / Staff |

**Allowed transitions:** Pending to Slip Uploaded; Slip Uploaded to Approved or Rejected; Rejected to Slip Uploaded (customer re-uploads); Approved to Delivered. Admins and Managers can override a status with a required note. Every change is recorded in an order history log.

### 7.2 Admin order features

- List with search (order number, customer name, phone) and filters (status, order type, date range).
- Order detail: items and variants, customer info, order type details, receipt preview with zoom, status timeline, internal notes.
- Actions: approve, reject (with reason), mark delivered, edit items or details (Admin/Manager), delete or archive (Admin).
- Optional printable order slip / kitchen ticket.
- Customer notification by email on status change if email is provided (see open questions for SMS/WhatsApp).

## 8. Admin Dashboard

Login at `/admin` with email and password via Supabase Auth. The admin area is protected by middleware and by database Row Level Security.

### 8.1 Dashboard (stats)

- Cards: today's orders, total revenue (Approved and Delivered), orders awaiting review (Slip Uploaded), pending orders, low-stock items.
- Charts: orders and revenue over time (7 / 30 / 90 days), orders by status, orders by type (pickup, delivery).
- Lists: best-selling products, latest orders, low-stock products.
- Date range filter.

### 8.2 Products page

- Table with image, name, category, price, stock, status; search, filter and bulk actions (activate, archive, delete).
- Create/edit form: details, images (drag and drop, reorder, set primary), variants editor, stock, category, tags, SEO fields.
- Quick inline stock update.
- Category management (add, edit, reorder, delete with safety check if products exist).

### 8.3 Orders page

As described in section 7.2.

### 8.4 Users page (Admin only)

- List of admin-side users with name, email, role, status, last login.
- Add user (invite by email or create with temporary password), edit role, deactivate/reactivate, reset password, delete.
- Roles: **Admin, Manager, Staff**. At least one active Admin must always exist.
- Customer accounts are viewable in a separate read-only tab (name, email, order count).

### 8.5 Settings (Admin)

- Shop name, logo (placeholder now, replaceable later), contact details, opening hours.
- Delivery areas (Malé, Hulhumalé), delivery fee, minimum order amount, cafe pickup address and hours.
- Bank/transfer details shown to customers.
- Pending-order expiry time, low-stock default threshold, currency.

## 9. Technical Architecture

| Area | Choice |
|---|---|
| Framework | Next.js (App Router) with TypeScript |
| Styling / UI | Tailwind CSS and shadcn/ui, themed with the palette above |
| Database | Supabase Postgres |
| Auth | Supabase Auth (customers and admin users), role stored in a `profiles` table |
| Security | Row Level Security on all tables, server-side checks in route handlers/server actions |
| Search | Postgres full-text search plus `pg_trgm` |
| Forms / validation | React Hook Form and Zod |
| Charts | Recharts |
| Image compression | Client-side (e.g. `browser-image-compression` or Canvas API) before upload |
| Hosting | Vercel Hobby, with environment variables for Supabase keys |
| Email | Resend or Supabase SMTP (free tier) |

### 9.1 Core data model (high level)

- `profiles` (id, name, phone, role: customer/admin/manager/staff, is_active)
- `categories` (id, name, slug, parent_id, sort_order, is_active)
- `products` (id, name, slug, description, category_id, base_price, status, is_featured, track_stock, low_stock_threshold)
- `product_variants` (id, product_id, name, sku, price, stock, is_active)
- `product_images` (id, product_id, variant_id nullable, full_data bytea, thumb_data bytea, mime_type, sort_order, is_primary)
- `tags` and `product_tags`
- `carts` and `cart_items` (for logged-in users)
- `orders` (id, order_number, user_id nullable, guest name/phone/email, order_type, pickup_time, delivery area/address/fee, subtotal, total, status, rejection_reason, notes)
- `order_items` (order_id, product_id, variant_id, name snapshot, price snapshot, quantity)
- `order_receipts` (order_id, data, mime_type, uploaded_at)
- `order_status_history` (order_id, from, to, changed_by, note, timestamp)
- `stock_movements` (variant_id, change, reason, order_id, user_id, timestamp)
- `settings` (key, value)

### 9.2 Free-tier constraints to design around

- **Vercel Hobby** is intended for personal, non-commercial use. A real business shop should plan to move to Vercel Pro (or another host) at launch.
- Serverless function limits (short execution time, about 4.5 MB request body) mean heavy work such as image compression must happen in the browser.
- **Supabase Free:** 500 MB database, projects pause after about a week of inactivity, limited backups. Production should use a paid plan or a keep-alive and a backup routine.
- Cache images and public pages aggressively (ISR / CDN caching) to reduce database reads.

## 10. Non-Functional Requirements

- **Performance:** menu page loads in under 2.5 s on a mid-range phone over 4G; thumbnails under about 60 KB each where quality allows.
- **Security:** HTTPS only; RLS enforced; role checks on every admin action; private receipt access; rate limiting on login, search and upload endpoints; file type and size validation on the server.
- **Accessibility:** WCAG AA contrast (verify the light green against text), keyboard navigation, alt text for images.
- **SEO:** server-rendered product pages, clean slugs, meta tags, sitemap.
- **Responsive:** mobile-first; admin usable on tablet.
- **Reliability:** order creation and stock deduction happen in a single database transaction to prevent overselling.
- **Auditability:** order status changes and stock movements are logged.
- **Localization-ready:** text and currency are configurable (single language in v1).

## 11. Milestones

| Phase | Scope |
|---|---|
| **1. Foundation** | Project setup, Supabase schema and RLS, auth, roles, design system and theme, placeholder logo |
| **2. Catalog** | Categories, products, variants, stock, image upload and compression, admin product pages |
| **3. Storefront** | Home, menu with search and filters, product page, cart |
| **4. Orders** | Checkout (guest and account), order types, receipt upload, status flow, order tracking page, admin orders page |
| **5. Dashboard and users** | Stats dashboard, user management, settings |
| **6. Polish and launch** | Email notifications, SEO, accessibility pass, performance and security review, deployment |

## 12. Success Metrics

- Customers can complete an order and upload a receipt in under 3 minutes.
- Receipt review turnaround time (Slip Uploaded to Approved/Rejected) is tracked on the dashboard.
- Zero overselling incidents.
- Menu page performance target met on mobile.

## 13. Future Versions

- Payment gateway integration (cards/wallets), replacing or complementing receipt upload.
- Coupons and loyalty, reviews, WhatsApp/SMS notifications.
- Delivery zone mapping and driver assignment.
- Final logo and brand refresh.

## 14. Assumptions and Open Questions

**Assumptions made in this draft (please confirm or correct):**

1. Delivery covers only Malé and Hulhumalé, pickup is from the cafe, and both are paid by receipt upload.
2. Stock is reserved when the order is placed and restored on rejection or cancellation.
3. A rejected customer can upload a new receipt.
4. Staff may approve/reject receipts; if you want only Admin/Manager to approve payments, the matrix changes.
5. Email is the only notification channel in v1.
6. One language and one currency, configurable in settings.

**Open questions:**

1. Which currency and which bank details/transfer methods should be shown for payment?
2. Is delivery a flat fee, per area, or free above a minimum amount? Should the delivery fee differ between Malé and Hulhumalé?
3. Do you need a "Cancelled" status in addition to the five you listed?
4. Should unpaid Pending orders auto-cancel after a set time (e.g. 24 hours)?
5. Do you want pre-orders or scheduled pickup/delivery times, or only "as soon as possible"?
6. Do you want WhatsApp or SMS notifications instead of (or in addition to) email?
7. Are you comfortable storing images in the database given the 500 MB free limit, or should we use Supabase Storage behind the same interface?
8. Do you need item-level options beyond variants (e.g. extra toppings with their own prices)?
9. Roughly how many products and how many orders per day do you expect?
10. Do you have a shop name and domain yet?
