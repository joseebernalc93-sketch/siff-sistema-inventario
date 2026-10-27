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
    message: "quiero un chifle un aceite la favorita y 5 libras de arroz muñeco y una coca cola",
    history: []
  };

  const res1 = await buildGeminiChatbotResponse(payload1 as any, catalog.products);
  console.log("RES1 intent:", res1.intent);
  console.log("RES1 answer:", res1.answer);
  console.log("RES1 products:", res1.products.map(p => p.name));
  console.log("RES1 suggested_order:", res1.suggested_order ? res1.suggested_order.items.length + " items" : "none");
  if (res1.suggested_order) {
    console.log(res1.suggested_order.items);
  }
}

run().catch(console.error);
