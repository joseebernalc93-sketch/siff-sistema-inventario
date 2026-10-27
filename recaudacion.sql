ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_handover_status varchar DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_handed_over_at timestamp with time zone;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_confirmed_at timestamp with time zone;
