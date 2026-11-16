# Fresh Bites: Restaurant & Ready Meals Online Shop (v1)

Next.js 14 (App Router, TypeScript, Tailwind) + Supabase (Postgres + Auth) + Vercel.
Built from `docs/PRD.md`. Pickup from the cafe or home delivery in Malé and Hulhumalé. Payment by bank transfer receipt upload (no gateway).

## 1. Set up Supabase
1. Create a project at supabase.com.
2. SQL Editor: run `supabase/schema.sql`, then (optional demo data) `supabase/seed.sql`.
3. Project Settings > API: copy the Project URL, `anon` key and `service_role` key.
4. Authentication > Providers > Email: for a simple start, turn off "Confirm email" (or keep it on for customers).

## 2. Run locally
```bash
npm install
cp .env.example .env.local     # fill in the 3 Supabase values
npm run dev                    # http://localhost:3000
```

## 3. Create the first admin
1. Supabase > Authentication > Users > Add user (email + password, auto-confirm).
2. SQL Editor:
```sql
update public.profiles set role = 'admin', full_name = 'Your Name'
where id = (select id from auth.users where email = 'you@example.com');
```
3. Sign in at `/admin/login`. Add Managers/Staff from Dashboard > Users.

## 4. Deploy to Vercel
Import the repo, add the same 3 env vars (+ `NEXT_PUBLIC_CURRENCY`, `SHOP_TIMEZONE`), deploy.
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (it is only used in server code).

## What is included
- Storefront: home, menu with search (typo tolerant) + filters (category, tags, price, in stock) + sort, product page with variants and gallery, cart, guest or account checkout, pickup/delivery (Malé, Hulhumalé), receipt upload, order tracking (link or order number + phone), customer accounts and order history.
- Orders: Pending, Slip Uploaded, Approved, Rejected, Delivered with enforced transitions, history log, stock deducted in one DB transaction (no overselling), stock released on rejection and re-reserved on re-upload.
- Images: compressed in the browser (products: max 2000 px, WebP q93 + 400 px thumbnail; receipts: max 1600 px, q75) and stored in Postgres `bytea`, served with long cache headers. Receipts are private.
- Admin: stats dashboard (orders, revenue, status/type, best sellers, low stock), products (variants, tags, stock, photos), categories, orders (filters, receipt preview, approve/reject/deliver, override, notes, print slip), users and roles (Admin, Manager, Staff), settings.
- Roles follow the PRD permission matrix (see `src/lib/auth.ts` and the pages' `requireStaff([...])` calls).

## Known gaps / simplifications (see PRD open questions)
- Not built yet: email notifications, automatic expiry of unpaid Pending orders (setting is stored; add a Vercel Cron later), About/Contact/Terms pages, order item editing, image drag-reorder (you can set the main photo), cart sync to the database for logged-in users (cart lives in the browser).
- Stock is released immediately when an order is rejected (PRD suggested a grace period).
- Image storage in Postgres will fill Supabase Free's 500 MB quickly. Images go through `/api/images` and `src/lib/hex.ts`, so moving to Supabase Storage later only touches those places.
- Vercel Hobby is for non-commercial use: upgrade before taking real customers. Supabase Free pauses after about a week of inactivity.
- This code was written without being able to run `npm install` / `next build` in the authoring sandbox. If the build reports a type error, `tsconfig.json` has `strict: false` to keep things lenient; please send me any error you hit.

## Brand
Light green `#8CC63F` primary, deep herb `#4F8A1E`, mint `#E9F6D8`, cream `#FAFDF5`, carrot accent `#F4A03A`, ink `#1F2A1C` (see `tailwind.config.ts`). Placeholder logo: Lucide chef-hat icon in `src/components/Logo.tsx`.
