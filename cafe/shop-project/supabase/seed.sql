-- Optional demo data. Run after schema.sql. Safe to delete afterwards from the admin dashboard.
insert into public.settings (key, value) values
  ('shop_name', 'Fresh Bites'),
  ('tagline', 'Fresh ready meals, made daily'),
  ('phone', ''),
  ('email', ''),
  ('address', 'Cafe address goes here'),
  ('opening_hours', 'Daily 8:00 to 22:00'),
  ('bank_details', E'Bank: Your Bank\nAccount name: Your Business Name\nAccount number: 0000000000000'),
  ('pickup_enabled', 'true'),
  ('delivery_enabled', 'true'),
  ('fee_male', '0'),
  ('fee_hulhumale', '0'),
  ('min_order', '0'),
  ('pending_expiry_hours', '24'),
  ('low_stock_default', '5')
on conflict (key) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Rice & Curries', 'rice-curries', 1),
  ('Burgers & Sandwiches', 'burgers-sandwiches', 2),
  ('Salads', 'salads', 3),
  ('Drinks', 'drinks', 4),
  ('Desserts', 'desserts', 5);

insert into public.tags (name) values ('vegetarian'), ('spicy'), ('halal'), ('gluten-free');

with c as (select id, slug from public.categories)
insert into public.products (name, slug, description, category_id, base_price, status, is_featured, track_stock, stock)
select * from (values
  ('Chicken Biryani', 'chicken-biryani', 'Fragrant basmati rice layered with spiced chicken.', (select id from c where slug='rice-curries'), 75, 'active', true, true, 0),
  ('Vegetable Curry Bowl', 'vegetable-curry-bowl', 'Seasonal vegetables in a mild coconut curry with rice.', (select id from c where slug='rice-curries'), 55, 'active', false, true, 20),
  ('Classic Beef Burger', 'classic-beef-burger', 'Grilled beef patty, cheese, lettuce, tomato, house sauce.', (select id from c where slug='burgers-sandwiches'), 65, 'active', true, true, 15),
  ('Garden Salad', 'garden-salad', 'Crisp greens, cucumber, tomato and lemon dressing.', (select id from c where slug='salads'), 40, 'active', false, true, 12),
  ('Fresh Lime Juice', 'fresh-lime-juice', 'Freshly squeezed lime, served cold.', (select id from c where slug='drinks'), 20, 'active', false, false, 0),
  ('Chocolate Brownie', 'chocolate-brownie', 'Rich, fudgy brownie baked daily.', (select id from c where slug='desserts'), 30, 'active', true, true, 10)
) as t(name, slug, description, category_id, base_price, status, is_featured, track_stock, stock);

insert into public.product_variants (product_id, name, price, stock, sort_order)
select id, v.name, v.price, v.stock, v.ord
from public.products p
join (values ('chicken-biryani','Regular',75,12,0), ('chicken-biryani','Large',95,8,1)) as v(slug,name,price,stock,ord)
  on v.slug = p.slug;

insert into public.product_tags (product_id, tag_id)
select p.id, t.id from public.products p, public.tags t
where (p.slug = 'vegetable-curry-bowl' and t.name in ('vegetarian'))
   or (p.slug = 'chicken-biryani' and t.name in ('spicy','halal'))
   or (p.slug = 'garden-salad' and t.name in ('vegetarian','gluten-free'));
