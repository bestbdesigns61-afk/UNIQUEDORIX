alter table public.products
    add column if not exists size text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_size_length'
    ) then
        alter table public.products
            add constraint products_size_length
            check (size is null or length(btrim(size)) between 1 and 80);
    end if;
end
$$;

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
                'size', nullif(btrim(v_product ->> 'size'), ''),
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

revoke all on function public.request_purchase_quote(jsonb, text, text, text, text, text, text) from public;
grant execute on function public.request_purchase_quote(jsonb, text, text, text, text, text, text) to anon, authenticated;
