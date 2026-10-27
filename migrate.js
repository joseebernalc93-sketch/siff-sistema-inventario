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
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE mobile_clients ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'cliente\';' });
  if (error) console.log('RPC Error:', error.message);
  else console.log('Success:', data);
}
run();
