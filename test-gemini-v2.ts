import fs from "fs";
const env = fs.readFileSync(".env.local", "utf-8");
env.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
});

import { buildGeminiChatbotResponse } from "./lib/gemini-chatbot";
import { getCatalog } from "./lib/catalog";

async function run() {
  const catalog = await getCatalog();
  const payload1 = {
    message: "quiero 3 libras de arroz muñeco, quiero 1 aceite la favorita y quiero un chifle",
    history: []
  };

  const res1 = await buildGeminiChatbotResponse(payload1 as any, catalog.products);
  console.log("RES1 from Gemini:");
  console.log(JSON.stringify(res1, null, 2));
}

run().catch(console.error);
