import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

import { buildChatbotResponse } from "@/lib/chatbot";
import { getEffectiveProductPrice } from "@/lib/pricing";
import type {
  ChatbotRequest,
  ChatbotResponse,
  OrderItemInput,
  Product,
} from "@/lib/types";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_GEMINI_PRODUCTS = 150;
const MAX_GEMINI_ANSWER_LENGTH = 720;

type GeminiSuggestedOrderItem = {
  presentation_id?: unknown;
  product_id?: unknown;
  quantity?: unknown;
};

export async function buildGeminiChatbotResponse(
  payload: ChatbotRequest,
  products: Product[],
): Promise<ChatbotResponse> {
  const fallback = buildChatbotResponse(payload, products);
  const localFallback: ChatbotResponse = { ...fallback, source: "local" };
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return { ...localFallback, source_reason: "missing_gemini_key" };
  }

  const fallbackProductIds =
    fallback.products.length > 0 &&
    fallback.intent !== "help" &&
    fallback.intent !== "complaint"
      ? new Set(fallback.products.map((product) => product.id))
      : null;

  const candidateProducts = selectCandidateProducts(fallback, products);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      contents: buildGeminiPrompt(payload, fallback, candidateProducts),
      config: {
        maxOutputTokens: 1600,
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
        },
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text ?? "";
    let answer = "";
    let suggestedOrderFromGemini: unknown = undefined;
    let intentFromGemini: ChatbotResponse["intent"] = fallback.intent;

    let validProductIds: string[] | undefined = undefined;

    const parsed = parseGeminiJson(responseText);
    if (isRecord(parsed)) {
      answer = sanitizeGeminiAnswer(parsed.answer);
      suggestedOrderFromGemini = parsed.suggested_order;
      intentFromGemini = readChatIntent(parsed.intent) ?? intentFromGemini;
      validProductIds = readStringArray(parsed.product_ids) ?? validProductIds;
    } else {
      answer = sanitizeGeminiAnswer(responseText);
    }

    if (looksLikeJsonObject(answer)) {
      const nestedParsed = parseGeminiJson(answer);
      if (isRecord(nestedParsed)) {
        answer = sanitizeGeminiAnswer(nestedParsed.answer);
        suggestedOrderFromGemini ??= nestedParsed.suggested_order;
        intentFromGemini =
          readChatIntent(nestedParsed.intent) ?? intentFromGemini;
        validProductIds =
          readStringArray(nestedParsed.product_ids) ?? validProductIds;
      } else {
        answer = "";
      }
    }

    if (!answer) {
      return { ...localFallback, source_reason: "gemini_empty_answer" };
    }

    let validSuggestedOrder:
      | { items: OrderItemInput[]; total: number }
      | undefined = undefined;
    const suggestedOrderItems = getGeminiSuggestedOrderItems(
      suggestedOrderFromGemini,
    );
    if (suggestedOrderItems.length > 0) {
      const items: OrderItemInput[] = [];
      let total = 0;

      for (const item of suggestedOrderItems) {
        const productId =
          typeof item.product_id === "string" ? item.product_id : "";
        if (fallbackProductIds && !fallbackProductIds.has(productId)) {
          continue;
        }

        const presentationId =
          typeof item.presentation_id === "string"
            ? item.presentation_id
            : null;
        const product = products.find((p) => p.id === productId);
        if (!product) continue;

        const qty = Number(item.quantity) || 1;
        const presentation = (product.presentations ?? []).find(
          (p) => p.id === presentationId,
        );

        const ivaMultiplier =
          product.has_iva && product.iva_rate ? 1 + product.iva_rate / 100 : 1;
        const unitPrice = presentation
          ? presentation.price
          : getEffectiveProductPrice(product).unitPrice;
        const finalPrice = unitPrice * ivaMultiplier;

        items.push({
          product_id: product.id,
          presentation_id: presentation ? presentation.id : null,
          quantity: qty,
        });

        total += finalPrice * qty;
      }

      if (items.length > 0) {
        validSuggestedOrder = { items, total };
        intentFromGemini = "order";
      }
    }

    const mergedSuggestedOrder = mergeSuggestedOrders(
      validSuggestedOrder,
      fallback.suggested_order,
      products,
    );

    const geminiResponse: ChatbotResponse = {
      ...fallback,
      intent: intentFromGemini,
      answer: fallback.suggested_order ? fallback.answer : answer,
      source: "gemini",
    };

    if (validProductIds && validProductIds.length > 0) {
      const matchedProducts = validProductIds
        .filter((id) => !fallbackProductIds || fallbackProductIds.has(id))
        .map((id) => products.find((p) => p.id === id)!)
        .filter(Boolean);
      if (matchedProducts.length > 0) {
        geminiResponse.products = matchedProducts;
      }
    }
    
    // Always merge fallback products to ensure we don't lose items Gemini missed
    const currentProducts = fallbackProductIds
      ? (geminiResponse.products ?? []).filter((product) =>
          fallbackProductIds.has(product.id),
        )
      : (geminiResponse.products ?? []);
    const mergedWithFallback = [...currentProducts];
    for (const fp of fallback.products) {
      if (!mergedWithFallback.some((mp) => mp.id === fp.id)) {
        mergedWithFallback.push(fp);
      }
    }
    geminiResponse.products = mergedWithFallback;

    if (mergedSuggestedOrder) {
      geminiResponse.suggested_order = mergedSuggestedOrder;
      
      const suggestedProducts = mergedSuggestedOrder.items
        .filter((i) => !fallbackProductIds || fallbackProductIds.has(i.product_id))
        .map((i) => products.find((p) => p.id === i.product_id)!)
        .filter(Boolean);
        
      const existingProducts = geminiResponse.products ?? [];
      const mergedProducts = [...existingProducts];
      
      for (const p of suggestedProducts) {
        if (!mergedProducts.some((mp) => mp.id === p.id)) {
          mergedProducts.push(p);
        }
      }
      
      geminiResponse.products = mergedProducts;
    }

    const compactAvailabilityAnswer = buildCompactAvailabilityAnswer(
      payload.message,
      geminiResponse,
    );
    if (compactAvailabilityAnswer) {
      geminiResponse.answer = compactAvailabilityAnswer;
    }

    return geminiResponse;
  } catch (error) {
    const sourceReason = classifyGeminiError(error);
    console.warn(
      "Gemini chatbot fallback:",
      error instanceof Error ? error.message : "unknown error",
    );
    return { ...localFallback, source_reason: sourceReason };
  }
}

function classifyGeminiError(error: unknown): ChatbotResponse["source_reason"] {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? "").toLowerCase();

  if (
    message.includes("api key") ||
    message.includes("apikey") ||
    message.includes("invalid") ||
    message.includes("expired")
  ) {
    return "gemini_invalid_key";
  }

  if (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("429")
  ) {
    return "gemini_quota_error";
  }

  if (
    message.includes("permission") ||
    message.includes("forbidden") ||
    message.includes("403")
  ) {
    return "gemini_permission_error";
  }

  if (
    message.includes("model") ||
    message.includes("not found") ||
    message.includes("404")
  ) {
    return "gemini_model_error";
  }

  return "gemini_error";
}

function selectCandidateProducts(
  fallback: ChatbotResponse,
  products: Product[],
) {
  if (fallback.intent === "help" || fallback.intent === "complaint") {
    return [];
  }

  if (fallback.products.length > 0) {
    return fallback.products.slice(0, MAX_GEMINI_PRODUCTS);
  }

  return products
    .filter((product) => product.is_active)
    .sort((first, second) => {
      const firstStock = Number(first.stock) > 0 ? 1 : 0;
      const secondStock = Number(second.stock) > 0 ? 1 : 0;

      if (firstStock !== secondStock) {
        return secondStock - firstStock;
      }

      return first.name.localeCompare(second.name);
    })
    .slice(0, MAX_GEMINI_PRODUCTS);
}

function buildGeminiPrompt(
  payload: ChatbotRequest,
  fallback: ChatbotResponse,
  products: Product[],
) {
  const catalog = products.map((product) => {
    const price = getEffectiveProductPrice(product);
    const ivaMultiplier = product.has_iva && product.iva_rate ? (1 + product.iva_rate / 100) : 1;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.categories?.name ?? null,
      provider: product.provider ?? null,
      price: Number((price.unitPrice * ivaMultiplier).toFixed(2)),
      price_label: price.label,
      available: Number(product.stock) > 0,
      presentations: (product.presentations ?? [])
        .filter(
          (presentation) =>
            presentation.is_active !== false &&
            presentation.use_for_sale !== false,
        )
        .map((presentation) => ({
          id: presentation.id,
          name: presentation.name,
          stock_quantity: Number(presentation.unit_quantity),
          price: Number((presentation.price * ivaMultiplier).toFixed(2)),
        })),
    };
  });

  const data = {
    customer_name: payload.customer_name ?? null,
    user_message: payload.message,
    recent_history: (payload.history ?? []).slice(-6).map((entry) => ({
      role: entry.role,
      message: entry.message,
      product_ids: entry.product_ids ?? [],
    })),
    products: catalog,
  };

  let customRules = "";
  try {
    const rulesPath = path.join(process.cwd(), "reglas-chatbot.txt");
    customRules = fs.readFileSync(rulesPath, "utf-8");
  } catch {}

  const rules = customRules.trim() || [
    "Eres el asistente del Minimarket Joelys para un prototipo de tesis.",
    "Responde en espanol claro, amable y natural, sin sonar repetitivo.",
    "Usa solamente los productos, precios y presentaciones incluidos en DATOS.",
    "No inventes productos, precios, promociones, imagenes ni horarios.",
    "Bajo ninguna circunstancia debes mencionar cuantas unidades o cajas exactas quedan en stock. Si el producto esta disponible, simplemente indica que si lo tienes o ayuda con el pedido.",
    "Si el usuario pregunta por varios productos o marcas y en DATOS solo aparecen algunos, indícale claramente cuáles SÍ tienes y cuáles NO tienes por el momento. Nunca ofrezcas un producto que no esté en DATOS.",
    "Asegurate de que tu propiedad 'answer' sea un texto corto, ve al grano, maximo dos frases.",
    "ESTRICTA COINCIDENCIA: Si el usuario busca un producto por nombre, sé muy estricto al coincidir (Ej: si pide 'aceite', devuelve SOLO aceites, NO sugieras 'achiote' u otra cosa que no tenga que ver, y así para todo producto).",
    "ACUMULAR PEDIDO: Si el usuario pide agregar un producto nuevo al pedido que ya estaban armando, debes incluir en 'suggested_order' TODOS los productos anteriores (basándote en 'recent_history') MÁS el nuevo producto. El 'suggested_order' SIEMPRE debe contener la lista completa acumulada de lo que el cliente quiere comprar en la sesión.",
    "Si el usuario pide varios productos, agregalos al carrito usando la propiedad 'suggested_order'.",
    "FLUJO DE COMPRA ASISTIDO (Paso a paso):",
    "Cuando el cliente mencione un producto sin especificar presentación ni cantidad (ej: solo dice 'atun'):",
    "1. PROHIBIDO incluir 'suggested_order'. El 'suggested_order' debe estar VACIO o no existir.",
    "2. Pregúntale en qué presentación quiere comprar mostrándole las presentaciones disponibles. Agrega SIEMPRE una última opción extra para 'Cancelar' (ej: '3. Cancelar').",
    "3. Si el cliente elige 'Cancelar', o si responde con la cantidad '0', detén el proceso y respóndele amablemente que se ha cancelado la compra de ese producto (NO incluyas suggested_order).",
    "4. Cuando escoja una presentación (y no sea cancelar), pregúntale qué cantidad desea comprar. Todavía NO incluyas 'suggested_order'.",
    "5. Solo cuando el cliente responda con la presentación Y la cantidad exacta mayor a 0, agrega ese producto usando 'suggested_order'.",
    "IMPORTANTE: NUNCA adivines producto, presentación ni cantidad. Si falta algún dato, PREGUNTA.",
  ].join("\\n");

  return [
    rules,
    "",
    "Responde SIEMPRE con un JSON valido con esta estructura exacta:",
    '{ "answer": "tu respuesta hablada", "intent": "order", "product_ids": ["id1"], "suggested_order": [ { "product_id": "...", "presentation_id": "...", "quantity": 1 } ] }',
    "En 'product_ids' incluye SOLO los IDs exactos de los productos que estas mencionando o sugiriendo en tu respuesta.",
    "Solo incluye 'suggested_order' si el usuario esta pidiendo comprar y las presentaciones estan claras. Si falta elegir presentacion o es una consulta, omite 'suggested_order' o envialo vacio.",
    "Usa los IDs exactos provistos en DATOS.",
    "",
    "DATOS:",
    JSON.stringify(data),
  ].join("\\n");
}

function sanitizeGeminiAnswer(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const answer = value
    .replace(/(?:^|\s)[*-]\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (answer.length <= MAX_GEMINI_ANSWER_LENGTH) {
    return answer;
  }

  return `${answer.slice(0, MAX_GEMINI_ANSWER_LENGTH - 3).trim()}...`;
}

function buildCompactAvailabilityAnswer(
  message: string,
  response: ChatbotResponse,
) {
  if (
    response.suggested_order ||
    response.intent === "complaint" ||
    response.intent === "help" ||
    !response.products?.length ||
    !isAvailabilityQuestion(message)
  ) {
    return null;
  }

  return `Si tenemos ${inferAvailabilityLabel(message, response.products)} y estas son nuestras presentaciones disponibles.`;
}

function isAvailabilityQuestion(message: string) {
  const normalized = normalizeAvailabilityText(message);
  const hasAvailabilityTerm =
    /\b(tiene|tienes|tienen|hay|vende|venden|disponible|disponibles)\b/.test(
      normalized,
    );
  const hasPriceTerm =
    /\b(cuesta|cuestan|precio|precios|vale|valen|valor)\b/.test(normalized);
  const hasOrderTerm =
    /\b(agrega|agregar|comprar|dame|llevar|necesito|pedido|quiero|reservar)\b/.test(
      normalized,
    );

  return hasAvailabilityTerm && !hasPriceTerm && !hasOrderTerm;
}

function inferAvailabilityLabel(message: string, products: Product[]) {
  const productNameTokens = new Set(
    products.flatMap((product) => tokenizeAvailabilityText(product.name)),
  );
  const messageTokens = tokenizeAvailabilityText(message).filter(
    (token) =>
      !AVAILABILITY_STOP_WORDS.has(token) && productNameTokens.has(token),
  );

  if (messageTokens.length > 0) {
    return [...new Set(messageTokens)].join(" ");
  }

  return products.length === 1 ? products[0].name : "opciones disponibles";
}

function tokenizeAvailabilityText(value: string) {
  return normalizeAvailabilityText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeAvailabilityText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AVAILABILITY_STOP_WORDS = new Set([
  "a",
  "al",
  "algo",
  "buenas",
  "buenos",
  "de",
  "del",
  "dias",
  "el",
  "en",
  "esta",
  "estan",
  "hay",
  "hola",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "por",
  "que",
  "si",
  "tarde",
  "tardes",
  "tiene",
  "tienes",
  "tienen",
  "tu",
  "vende",
  "venden",
  "y",
]);

function parseGeminiJson(value: string) {
  const trimmed = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function looksLikeJsonObject(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    /"answer"\s*:/.test(trimmed)
  );
}

function getGeminiSuggestedOrderItems(
  value: unknown,
): GeminiSuggestedOrderItem[] {
  const rawItems = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : [];

  return rawItems.filter(isRecord).map((item) => ({
    presentation_id: item.presentation_id,
    product_id: item.product_id,
    quantity: item.quantity,
  }));
}

function mergeSuggestedOrders(
  primary: ChatbotResponse["suggested_order"] | undefined,
  fallback: ChatbotResponse["suggested_order"] | undefined,
  products: Product[],
) {
  const items: OrderItemInput[] = [];
  const seen = new Set<string>();
  const seenProducts = new Set<string>();

  for (const source of [fallback, primary]) {
    for (const item of source?.items ?? []) {
      const key = `${item.product_id}:${item.presentation_id ?? ""}`;
      if (seen.has(key) || seenProducts.has(item.product_id)) {
        continue;
      }

      items.push(item);
      seen.add(key);
      seenProducts.add(item.product_id);
    }
  }

  if (items.length === 0) {
    return undefined;
  }

  return {
    items,
    total: calculateSuggestedOrderTotal(items, products),
  };
}

function calculateSuggestedOrderTotal(
  items: OrderItemInput[],
  products: Product[],
) {
  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    if (!product) {
      return sum;
    }

    const presentation = (product.presentations ?? []).find(
      (entry) => entry.id === item.presentation_id,
    );
    const ivaMultiplier =
      product.has_iva && product.iva_rate ? 1 + product.iva_rate / 100 : 1;
    const unitPrice = presentation
      ? presentation.price
      : getEffectiveProductPrice(product).unitPrice;

    return sum + unitPrice * ivaMultiplier * item.quantity;
  }, 0);

  return Number(total.toFixed(2));
}

function readChatIntent(value: unknown): ChatbotResponse["intent"] | null {
  return value === "catalog" ||
    value === "order" ||
    value === "complaint" ||
    value === "help"
    ? value
    : null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );

  return items.length > 0 ? items : undefined;
}
