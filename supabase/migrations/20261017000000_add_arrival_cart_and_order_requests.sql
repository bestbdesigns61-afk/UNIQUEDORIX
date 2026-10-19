alter table public.products
    add column if not exists price numeric(12, 2),
    add column if not exists stock integer;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_price_nonnegative'
    ) then
        alter table public.products
            add constraint products_price_nonnegative
            check (price is null or price >= 0);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_stock_nonnegative'
    ) then
        alter table public.products
            add constraint products_stock_nonnegative
            check (stock is null or stock >= 0);
    end if;
end
$$;

create table if not exists public.purchase_orders (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null,
    email text not null,
    phone text not null,
    delivery_address text not null,
    delivery_city text not null,
    delivery_state text not null,
    line_items jsonb not null check (jsonb_typeof(line_items) = 'array'),
    subtotal numeric(12, 2) not null check (subtotal > 0),
    delivery_fee numeric(12, 2) check (delivery_fee is null or delivery_fee >= 0),
    payment_link text,
    payment_requested_at timestamptz,
    status text not null default 'awaiting_delivery_quote'
        check (status in ('awaiting_delivery_quote', 'awaiting_payment', 'paid', 'cancelled', 'expired')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (
        status <> 'awaiting_payment'
        or (delivery_fee is not null and payment_link is not null)
    ),
    check (
        status <> 'paid'
        or payment_requested_at is not null
    )
);

create table if not exists public.order_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.order_admins enable row level security;
alter table public.purchase_orders enable row level security;

revoke all on public.order_admins from anon, authenticated;
grant select on public.order_admins to authenticated;

drop policy if exists order_admins_read_self on public.order_admins;
create policy order_admins_read_self
    on public.order_admins
    for select
    to authenticated
    using (user_id = auth.uid());

revoke all on public.purchase_orders from anon, authenticated;
grant select on public.purchase_orders to authenticated;
grant update (delivery_fee, payment_link, payment_requested_at, status)
    on public.purchase_orders to authenticated;

drop policy if exists purchase_orders_admin_read on public.purchase_orders;
create policy purchase_orders_admin_read
    on public.purchase_orders
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.order_admins
            where user_id = auth.uid()
        )
    );

drop policy if exists purchase_orders_admin_update on public.purchase_orders;
create policy purchase_orders_admin_update
    on public.purchase_orders
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.order_admins
            where user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.order_admins
            where user_id = auth.uid()
        )
    );

create or replace function public.request_purchase_quote(
    p_items jsonb,
    p_customer_name text,
    p_email text,
    p_phone text,
    p_address text,
    p_city text,
    p_state text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_item jsonb;
    v_product jsonb;
    v_product_id text;
    v_quantity_text text;
    v_quantity integer;
    v_price numeric(12, 2);
    v_subtotal numeric(12, 2) := 0;
    v_line_items jsonb := '[]'::jsonb;
    v_order_id uuid;
begin
    if coalesce(jsonb_typeof(p_items), '') <> 'array' then
        raise exception 'Your cart must contain a list of items.';
    end if;

    if jsonb_array_length(p_items) < 1
       or jsonb_array_length(p_items) > 30 then
        raise exception 'Your cart is empty or contains too many items.';
    end if;

    if length(trim(coalesce(p_customer_name, ''))) not between 2 and 120
       or length(trim(coalesce(p_email, ''))) not between 5 and 254
       or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or length(trim(coalesce(p_phone, ''))) not between 6 and 32
       or length(trim(coalesce(p_address, ''))) not between 5 and 500
       or length(trim(coalesce(p_city, ''))) not between 2 and 100
       or length(trim(coalesce(p_state, ''))) not between 2 and 100 then
        raise exception 'Please provide valid contact and delivery details.';
    end if;

    for v_item in
        select value
        from jsonb_array_elements(p_items)
    loop
        v_product_id := nullif(trim(v_item ->> 'id'), '');
        v_quantity_text := v_item ->> 'quantity';

        if v_product_id is null
           or v_quantity_text is null
           or v_quantity_text !~ '^[1-9][0-9]{0,2}$' then
            raise exception 'A cart item or quantity is invalid.';
        end if;

        v_quantity := v_quantity_text::integer;
        if exists (
            select 1
            from jsonb_array_elements(v_line_items) as existing_item
            where existing_item ->> 'product_id' = v_product_id
        ) then
            raise exception 'A product appears more than once in the cart.';
        end if;

        update public.products as product
        set stock = product.stock - v_quantity
        where product.id::text = v_product_id
          and product."isNewArrival" is true
          and product.price > 0
          and product.stock is not null
          and product.stock >= v_quantity
        returning to_jsonb(product) into v_product;

        if not found then
            raise exception 'A product in your cart is no longer available or has insufficient stock.';
        end if;

        v_price := nullif(v_product ->> 'price', '')::numeric;

        if v_price is null or v_price <= 0 then
            raise exception 'A product in your cart does not have a valid price.';
        end if;

        v_subtotal := v_subtotal + v_price * v_quantity;
        v_line_items := v_line_items || jsonb_build_array(
            jsonb_build_object(
                'product_id', v_product_id,
                'name', v_product ->> 'name',
                'category', v_product ->> 'category',
                'image_src', v_product ->> 'imageSrc',
                'unit_price', v_price,
                'quantity', v_quantity,
                'line_total', v_price * v_quantity
            )
        );
    end loop;

    insert into public.purchase_orders (
        customer_name,
        email,
        phone,
        delivery_address,
        delivery_city,
        delivery_state,
        line_items,
        subtotal
    )
    values (
        trim(p_customer_name),
        trim(p_email),
        trim(p_phone),
        trim(p_address),
        trim(p_city),
        trim(p_state),
        v_line_items,
        v_subtotal
    )
    returning id into v_order_id;

    return jsonb_build_object(
        'id', v_order_id,
        'subtotal', v_subtotal
    );
end
$$;

create or replace function public.release_cancelled_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_item jsonb;
    v_product_id text;
    v_quantity integer;
begin
    if new.status in ('cancelled', 'expired')
       and old.status in ('awaiting_delivery_quote', 'awaiting_payment') then
        for v_item in
            select value
            from jsonb_array_elements(new.line_items)
        loop
            v_product_id := v_item ->> 'product_id';
            v_quantity := (v_item ->> 'quantity')::integer;

            update public.products
            set stock = stock + v_quantity
            where id::text = v_product_id;
        end loop;
    end if;

    return new;
end
$$;

create or replace function public.start_order_payment_window(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_order public.purchase_orders;
begin
    if auth.uid() is null or not exists (
        select 1
        from public.order_admins
        where user_id = auth.uid()
    ) then
        raise exception 'Only an authorized order admin can start the payment window.';
    end if;

    update public.purchase_orders
    set payment_requested_at = now(),
        updated_at = now()
    where id = p_order_id
      and status = 'awaiting_payment'
      and payment_requested_at is null
    returning * into v_order;

    if not found then
        raise exception 'The order is not waiting for a payment window to start.';
    end if;

    return jsonb_build_object(
        'id', v_order.id,
        'payment_requested_at', v_order.payment_requested_at
    );
end
$$;

drop trigger if exists purchase_orders_decrement_stock on public.purchase_orders;
drop trigger if exists purchase_orders_release_stock on public.purchase_orders;
create trigger purchase_orders_release_stock
    after update of status on public.purchase_orders
    for each row
    execute function public.release_cancelled_order_stock();

revoke all on function public.request_purchase_quote(jsonb, text, text, text, text, text, text) from public;
grant execute on function public.request_purchase_quote(jsonb, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.release_cancelled_order_stock() from public;
revoke all on function public.start_order_payment_window(uuid) from public;
grant execute on function public.start_order_payment_window(uuid) to authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
    v_job_id bigint;
begin
    select jobid into v_job_id
    from cron.job
    where jobname = 'expire-unpaid-purchase-orders';

    if v_job_id is not null then
        perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
        'expire-unpaid-purchase-orders',
        '* * * * *',
        $job$
            update public.purchase_orders
            set status = 'expired',
                updated_at = now()
            where status = 'awaiting_payment'
              and payment_requested_at <= now() - interval '48 hours'
        $job$
    );
end
$$;
