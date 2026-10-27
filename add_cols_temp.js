const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar DEFAULT 'efectivo'; ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_receipt_url varchar;"
  });

  if (error) {
    console.error('RPC failed:', error.message);
    console.log("Please run this on Supabase SQL Editor if RPC failed:");
    console.log("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar DEFAULT 'efectivo';");
    console.log("ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_receipt_url varchar;");
  } else {
    console.log('Success:', data);
  }
}

run();
