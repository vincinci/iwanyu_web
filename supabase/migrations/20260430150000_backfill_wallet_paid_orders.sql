-- Backfill wallet-paid orders that were financially completed
-- but left with pending-looking order metadata because create-order
-- attempted to set an invalid order status value.

update public.orders o
set
  status = 'Processing',
  payment_verified_at = coalesce(o.payment_verified_at, now()),
  payment = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(o.payment, '{}'::jsonb),
        '{payment_status}',
        '"wallet_paid"'::jsonb,
        true
      ),
      '{verified}',
      'true'::jsonb,
      true
    ),
    '{verified_at}',
    to_jsonb(coalesce(o.payment_verified_at, now())::text),
    true
  ),
  updated_at = now()
where coalesce(o.payment->>'selected', '') = 'wallet'
  and coalesce(o.payment->>'payment_status', '') <> 'wallet_paid'
  and coalesce(o.payment->>'verified', 'false') <> 'true'
  and o.payment_verified_at is null
  and exists (
    select 1
    from public.wallet_transactions wt
    where wt.external_transaction_id = 'order_' || o.id::text || '_platform_fee'
      and wt.type = 'platform_fee'
  );

update public.order_items oi
set
  status = 'Processing',
  updated_at = now()
where exists (
  select 1
  from public.orders o
  where o.id = oi.order_id
    and coalesce(o.payment->>'selected', '') = 'wallet'
    and coalesce(o.payment->>'payment_status', '') = 'wallet_paid'
);
