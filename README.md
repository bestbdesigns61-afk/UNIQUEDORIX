# UNIQUEDORIX

Static storefront for Unique Dorrix Ventures. The site uses plain HTML, CSS, and JavaScript, with Supabase for New Arrivals and order requests.

## New Arrivals cart

- New Arrival products need a `price` (in naira) and `stock` quantity set in the admin dashboard before they can be added to the cart. Staff can also enter a size such as `10`, `Medium`, or `42`; that size appears on the storefront, in the cart, and in the admin order details.
- Each product record represents one size and its available quantity. To manage stock independently by size, create a separate product record for each size.
- The cart is stored in the visitor's browser. Submitting it atomically reserves the requested stock and creates an order request in Supabase; it does not charge the customer.
- Staff confirm delivery charges and add a Paystack payment link in the Folasade dashboard. Staff send it by email and WhatsApp, then start the 48-hour timer.
- Unpaid requests expire 48 hours after the timer is started, and their reserved stock is released automatically by the database cron job. Buyers are told they must submit a new request after expiry.
- Delivery charges are intentionally not calculated at checkout because staff confirm the destination and fee manually.

## Supabase setup

1. Run the SQL migrations in timestamp order. For an existing project that already ran the order-request migration, apply [`supabase/migrations/20261018000000_add_product_size.sql`](./supabase/migrations/20261018000000_add_product_size.sql) to add product sizes and include them in order snapshots.
2. Configure the Supabase anon key in `script.js`. The key in this repository is a placeholder; do not put a service-role key in browser code.
3. Add the staff Supabase Auth user to `public.order_admins` using the Supabase SQL editor. For example:

   ```sql
   insert into public.order_admins (user_id)
   select id from auth.users where email = 'staff@example.com'
   on conflict do nothing;
   ```

4. In the Folasade dashboard, enter a size (when applicable), price, and available stock quantity for each New Arrival product.
5. Staff review and manage pending orders in the Folasade dashboard. The customer order table is protected by RLS and only designated staff accounts can access it.

Payment-link generation, confirmation that a payment was received, and email/WhatsApp delivery are manual; no gateway secret or messaging-provider credential is used by either browser site. Database expiry does not invalidate an external Paystack URL, so staff must deactivate the Paystack link when an unpaid order expires.
