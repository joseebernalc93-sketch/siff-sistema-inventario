const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key) acc[key.trim()] = value.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || '';

const query = "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar DEFAULT 'efectivo'; ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_receipt_url varchar;";

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
run();
