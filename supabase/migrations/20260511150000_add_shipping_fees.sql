-- Add shipping fees based on location (Kigali: 2000 RWF, Outside Kigali: 5000 RWF)

-- Add shipping_fee_rwf column to orders table
alter table public.orders
  add column if not exists shipping_fee_rwf integer not null default 0 check (shipping_fee_rwf >= 0);

create or replace function public.compute_order_totals(
  p_items jsonb, -- [{productId, quantity}]
  p_discount_code text default null,
  p_city text default null -- City/District for shipping calculation
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
  v_subtotal integer := 0;
  v_discount_rwf integer := 0;
  v_effective_subtotal integer;
  v_service_fee integer;
  v_shipping_fee integer := 0;
  v_total integer;
  v_vendor_payout integer;
  v_discount record;
  v_line_items jsonb := '[]'::jsonb;
begin
  -- 1. Calculate subtotal from DB prices (not client-supplied)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price_rwf, vendor_id, title, image_url, in_stock, stock_quantity
    into v_product
    from public.products
    where id = (v_item->>'productId')
      and deleted_at is null;

    if not found then
      raise exception 'Product % not found', (v_item->>'productId');
    end if;

    if not v_product.in_stock then
      raise exception 'Product % is out of stock', v_product.title;
    end if;

    if v_product.stock_quantity is not null
       and v_product.stock_quantity < (v_item->>'quantity')::int then
      raise exception 'Insufficient stock for %. Available: %, Requested: %',
        v_product.title, v_product.stock_quantity, (v_item->>'quantity')::int;
    end if;

    v_subtotal := v_subtotal + (v_product.price_rwf * (v_item->>'quantity')::int);

    v_line_items := v_line_items || jsonb_build_object(
      'productId', v_product.id,
      'vendorId', v_product.vendor_id,
      'title', v_product.title,
      'price_rwf', v_product.price_rwf,
      'quantity', (v_item->>'quantity')::int,
      'image_url', v_product.image_url
    );
  end loop;

  -- 2. Apply discount code if provided
  if p_discount_code is not null and p_discount_code <> '' then
    select * into v_discount
    from public.discount_codes
    where upper(code) = upper(p_discount_code)
      and active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
      and (max_redemptions is null or redeemed_count < max_redemptions);

    if found then
      if v_subtotal >= coalesce(v_discount.min_subtotal_rwf, 0) then
        if v_discount.discount_type = 'fixed' then
          v_discount_rwf := least(v_subtotal, coalesce(v_discount.amount_rwf, 0));
        else
          v_discount_rwf := least(v_subtotal,
            round((v_subtotal * coalesce(v_discount.percentage, 0))::numeric / 100)::int);
        end if;
      end if;
    end if;
  end if;

  -- 3. Calculate shipping fee based on city
  -- Kigali: 2000 RWF, Outside Kigali: 5000 RWF
  if p_city is not null and trim(p_city) <> '' then
    if lower(trim(p_city)) = 'kigali' or lower(trim(p_city)) like '%kigali%' then
      v_shipping_fee := 2000;
    else
      v_shipping_fee := 5000;
    end if;
  else
    -- Default to Kigali if no city provided
    v_shipping_fee := 2000;
  end if;

  -- 4. Compute totals using same fee structure as lib/fees.ts
  v_effective_subtotal := greatest(0, v_subtotal - v_discount_rwf);
  v_service_fee := round(v_effective_subtotal * 0.03);      -- 3% guest service fee
  v_total := v_effective_subtotal + v_service_fee + v_shipping_fee;
  v_vendor_payout := round(v_effective_subtotal * 0.93);     -- vendor gets 93% (7% host fee)

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'discount_rwf', v_discount_rwf,
    'effective_subtotal', v_effective_subtotal,
    'service_fee', v_service_fee,
    'shipping_fee', v_shipping_fee,
    'total', v_total,
    'vendor_payout', v_vendor_payout,
    'line_items', v_line_items
  );
end;
$$;

-- Update grant to include new parameter
grant execute on function public.compute_order_totals(jsonb, text, text) to authenticated;
