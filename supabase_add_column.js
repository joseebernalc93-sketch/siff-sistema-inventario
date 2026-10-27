const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_deleted_by_admin BOOLEAN DEFAULT false;'
  });

  if (error) {
    console.error('RPC failed, trying raw query or checking if column exists...', error.message);
    
    // Trying to insert a test record to see if it works, or we can just ignore RPC if it doesn't exist
    // Wait, let's just create a SQL file and the user can run it, or I can try a different approach.
  } else {
    console.log('Success:', data);
  }
}

run();
