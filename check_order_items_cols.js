const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key) acc[key.trim()] = value.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  console.log("order_items:", error || (data && data[0] ? Object.keys(data[0]) : "No data"));
}

check();
