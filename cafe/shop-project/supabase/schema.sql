-- =====================================================================
-- Restaurant & Ready Meals Shop: database schema
-- Run this whole file once in the Supabase SQL Editor.
-- =====================================================================
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer','admin','manager','staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  base_price numeric(10,2) not null default 0 check (base_price >= 0),
  status text not null default 'draft' check (status in ('active','draft','archived')),
  is_featured boolean not null default false,
  track_stock boolean not null default true,
  stock int not null default 0 check (stock >= 0),            -- used when the product has no variants
  low_stock_threshold int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  price numeric(10,2) check (price >= 0),                      -- null = use product base price
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

-- Product images are stored in the database (bytea): a full size and a thumbnail.
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  full_data bytea not null,
  thumb_data bytea not null,
  mime_type text not null default 'image/webp',
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create sequence public.order_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ORD-' || nextval('public.order_seq')::text),
  user_id uuid references auth.users(id) on delete set null,
  guest_name text not null,
  guest_phone text not null,
  guest_email text,
  order_type text not null check (order_type in ('pickup','delivery')),
  pickup_time timestamptz,
  delivery_area text,
  delivery_address text,
  delivery_fee numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','slip_uploaded','approved','rejected','delivered')),
  rejection_reason text,
  notes text,
  internal_notes text,
  access_token uuid not null default gen_random_uuid(),         -- lets guests open their own order page
  stock_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  name text not null,                -- snapshot
  variant_name text,                 -- snapshot
  price numeric(10,2) not null,      -- snapshot
  quantity int not null check (quantity > 0)
);

create table public.order_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  data bytea not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  change int not null,
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value text not null default ''
);

create index on public.products using gin (name gin_trgm_ops);
create index on public.products (status, category_id);
create index on public.product_variants (product_id);
create index on public.product_images (product_id);
create index on public.orders (status, created_at desc);
create index on public.orders (user_id);
create index on public.order_items (order_id);
create index on public.order_receipts (order_id);

-- ---------------------------------------------------------------------
-- New auth user -> profile (role 'customer'). Roles are changed by admins.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Search: ILIKE on name / description / category, plus fuzzy match on name
-- ---------------------------------------------------------------------
create or replace function public.search_products(q text) returns setof uuid
language sql stable as $$
  select p.id
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.status = 'active'
    and (p.name ilike '%' || q || '%'
      or p.description ilike '%' || q || '%'
      or c.name ilike '%' || q || '%'
      or word_similarity(q, p.name) > 0.4)
$$;

-- ---------------------------------------------------------------------
-- Stock helpers (internal)
-- ---------------------------------------------------------------------
create or replace function public._release_stock(o uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select oi.product_id, oi.variant_id, oi.quantity, p.track_stock
    from order_items oi join products p on p.id = oi.product_id
    where oi.order_id = o
  loop
    if r.track_stock then
      if r.variant_id is not null then
        update product_variants set stock = stock + r.quantity where id = r.variant_id;
      else
        update products set stock = stock + r.quantity where id = r.product_id;
      end if;
      insert into stock_movements (product_id, variant_id, change, reason, order_id)
      values (r.product_id, r.variant_id, r.quantity, 'order_rejected_release', o);
    end if;
  end loop;
  update orders set stock_released = true where id = o;
end $$;

create or replace function public._reserve_stock(o uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; cur int;
begin
  for r in
    select oi.product_id, oi.variant_id, oi.quantity, oi.name, p.track_stock
    from order_items oi join products p on p.id = oi.product_id
    where oi.order_id = o
  loop
    if r.track_stock then
      if r.variant_id is not null then
        select stock into cur from product_variants where id = r.variant_id for update;
        if cur < r.quantity then raise exception 'OUT_OF_STOCK:%', r.name; end if;
        update product_variants set stock = stock - r.quantity where id = r.variant_id;
      else
        select stock into cur from products where id = r.product_id for update;
        if cur < r.quantity then raise exception 'OUT_OF_STOCK:%', r.name; end if;
        update products set stock = stock - r.quantity where id = r.product_id;
      end if;
      insert into stock_movements (product_id, variant_id, change, reason, order_id)
      values (r.product_id, r.variant_id, -r.quantity, 'order_resubmitted_reserve', o);
    end if;
  end loop;
  update orders set stock_released = false where id = o;
end $$;

create or replace function public._apply_status(o uuid, to_status text, note text, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cur text; rel boolean;
begin
  select status, stock_released into cur, rel from orders where id = o for update;
  if to_status = 'rejected' and not rel then
    perform public._release_stock(o);
  elsif cur = 'rejected' and to_status <> 'rejected' and rel then
    perform public._reserve_stock(o);
  end if;
  update orders set
    status = to_status,
    rejection_reason = case when to_status = 'rejected' then note
                            when to_status = 'slip_uploaded' then null
                            else rejection_reason end,
    updated_at = now()
  where id = o;
  insert into order_status_history (order_id, from_status, to_status, changed_by, note)
  values (o, cur, to_status, uid, note);
end $$;

-- ---------------------------------------------------------------------
-- Place an order: validates, prices from the DB, deducts stock, all in one transaction
-- ---------------------------------------------------------------------
create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod products%rowtype; pv product_variants%rowtype; has_var boolean;
  qty int; unit numeric; sub numeric := 0;
  oid uuid := gen_random_uuid(); onum text; tok uuid;
  otype text := p->>'order_type';
  fee numeric := case when p->>'order_type' = 'delivery' then coalesce((p->>'delivery_fee')::numeric, 0) else 0 end;
  min_order numeric := coalesce((p->>'min_order')::numeric, 0);
begin
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  insert into orders (id, user_id, guest_name, guest_phone, guest_email, order_type, pickup_time,
                      delivery_area, delivery_address, delivery_fee, notes)
  values (oid, nullif(p->>'user_id', '')::uuid, p->>'name', p->>'phone', nullif(p->>'email', ''),
          otype, nullif(p->>'pickup_time', '')::timestamptz,
          nullif(p->>'delivery_area', ''), nullif(p->>'delivery_address', ''), fee, nullif(p->>'notes', ''))
  returning order_number, access_token into onum, tok;

  for it in select * from jsonb_array_elements(p->'items') loop
    qty := greatest((it->>'quantity')::int, 1);
    select * into prod from products where id = (it->>'product_id')::uuid and status = 'active' for update;
    if not found then raise exception 'UNAVAILABLE:%', coalesce(it->>'name', 'An item'); end if;

    has_var := false;
    if coalesce(it->>'variant_id', '') <> '' then
      select * into pv from product_variants
        where id = (it->>'variant_id')::uuid and product_id = prod.id and is_active for update;
      if not found then raise exception 'UNAVAILABLE:%', prod.name; end if;
      has_var := true;
    elsif exists (select 1 from product_variants where product_id = prod.id and is_active) then
      raise exception 'UNAVAILABLE:%', prod.name;   -- a variant must be chosen
    end if;

    unit := coalesce(case when has_var then pv.price end, prod.base_price);

    if prod.track_stock then
      if has_var then
        if pv.stock < qty then raise exception 'OUT_OF_STOCK:%', prod.name || ' (' || pv.name || ')'; end if;
        update product_variants set stock = stock - qty where id = pv.id;
      else
        if prod.stock < qty then raise exception 'OUT_OF_STOCK:%', prod.name; end if;
        update products set stock = stock - qty where id = prod.id;
      end if;
      insert into stock_movements (product_id, variant_id, change, reason, order_id)
      values (prod.id, case when has_var then pv.id end, -qty, 'order_placed', oid);
    end if;

    insert into order_items (order_id, product_id, variant_id, name, variant_name, price, quantity)
    values (oid, prod.id, case when has_var then pv.id end, prod.name,
            case when has_var then pv.name end, unit, qty);
    sub := sub + unit * qty;
  end loop;

  if sub < min_order then raise exception 'MIN_ORDER:%', min_order; end if;

  update orders set subtotal = sub, total = sub + fee where id = oid;
  insert into order_status_history (order_id, from_status, to_status, note)
  values (oid, null, 'pending', 'Order placed');

  return jsonb_build_object('id', oid, 'order_number', onum, 'access_token', tok);
end $$;

-- ---------------------------------------------------------------------
-- Staff status change (transition rules; force = admin/manager override)
-- ---------------------------------------------------------------------
create or replace function public.change_order_status(
  p_order uuid, p_to text, p_note text, p_user uuid, p_force boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare cur text; allowed text[];
begin
  select status into cur from orders where id = p_order;
  if cur is null then raise exception 'NOT_FOUND'; end if;
  allowed := case cur
    when 'pending' then array['slip_uploaded']
    when 'slip_uploaded' then array['approved','rejected']
    when 'rejected' then array['slip_uploaded']
    when 'approved' then array['delivered']
    else array[]::text[] end;
  if not p_force and not (p_to = any(allowed)) then raise exception 'INVALID_TRANSITION'; end if;
  if p_to = 'rejected' and coalesce(trim(p_note), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  if p_force and coalesce(trim(p_note), '') = '' then raise exception 'NOTE_REQUIRED'; end if;
  perform public._apply_status(p_order, p_to, p_note, p_user);
end $$;

-- ---------------------------------------------------------------------
-- Customer receipt upload (data passed as a hex string)
-- ---------------------------------------------------------------------
create or replace function public.submit_receipt(p_order_number text, p_data text, p_mime text) returns void
language plpgsql security definer set search_path = public as $$
declare o uuid; cur text;
begin
  select id, status into o, cur from orders where order_number = p_order_number for update;
  if o is null then raise exception 'NOT_FOUND'; end if;
  if cur not in ('pending', 'rejected') then raise exception 'NOT_ALLOWED'; end if;
  insert into order_receipts (order_id, data, mime_type) values (o, decode(p_data, 'hex'), p_mime);
  perform public._apply_status(o, 'slip_uploaded', 'Receipt uploaded', null);
end $$;

-- Only the server (service role) may call the write functions.
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
revoke all on function public.change_order_status(uuid, text, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.submit_receipt(text, text, text) from public, anon, authenticated;
revoke all on function public._release_stock(uuid) from public, anon, authenticated;
revoke all on function public._reserve_stock(uuid) from public, anon, authenticated;
revoke all on function public._apply_status(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.change_order_status(uuid, text, text, uuid, boolean) to service_role;
grant execute on function public.submit_receipt(text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
-- Public (anon) can only read the active catalogue + settings.
-- Everything else is reached through server code using the service role.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.tags enable row level security;
alter table public.product_tags enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_receipts enable row level security;
alter table public.order_status_history enable row level security;
alter table public.stock_movements enable row level security;
alter table public.settings enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid());
create policy "read active categories" on public.categories for select using (is_active);
create policy "read active products" on public.products for select using (status = 'active');
create policy "read active variants" on public.product_variants for select using (is_active);
create policy "read tags" on public.tags for select using (true);
create policy "read product tags" on public.product_tags for select using (true);
create policy "read image metadata" on public.product_images for select using (true);
create policy "read settings" on public.settings for select using (true);

-- Image bytes are only served through /api/images; the public API can read metadata columns only.
revoke select on public.product_images from anon, authenticated;
grant select (id, product_id, variant_id, mime_type, is_primary, sort_order, created_at)
  on public.product_images to anon, authenticated;
