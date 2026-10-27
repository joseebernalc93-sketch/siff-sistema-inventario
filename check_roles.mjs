import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
  const { data, error } = await supabase.from("mobile_clients").select("id, full_name, role").limit(5);
  console.log("Current users:", data);
  if (data && data.length > 0) {
    const userId = data[0].id;
    console.log("Updating role to empleado for", userId);
    const update = await supabase.from("mobile_clients").update({ role: "empleado" }).eq("id", userId).select("id, full_name, role");
    console.log("Update result:", update.data);
  }
}

main().catch(console.error);
