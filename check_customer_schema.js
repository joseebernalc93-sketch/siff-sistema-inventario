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
  const { data: cols, error: err2 } = await supabase.from('customers').select('identity_number').limit(1);
  console.log("customers identity_number:", err2 ? err2.message : "exists!");

  const { data: cols2, error: err3 } = await supabase.from('mobile_clients').select('identity_number').limit(1);
  console.log("mobile_clients identity_number:", err3 ? err3.message : "exists!");
}

check();
