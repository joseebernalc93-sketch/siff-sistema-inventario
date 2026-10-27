import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envLocal = fs.readFileSync(".env.local", "utf8");
let url = "";
let key = "";
for (const line of envLocal.split("\n")) {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
    url = line.split("=")[1].trim();
  }
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
    key = line.split("=")[1].trim();
  }
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from("mobile_clients").select("id, full_name, role, identity_number").eq("identity_number", "0963671725").single();
  console.log("Jose Salazar in DB:", data);
}

main().catch(console.error);
