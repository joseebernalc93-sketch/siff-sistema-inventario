import { buildGeminiChatbotResponse } from "@/lib/gemini-chatbot";
import { buildChatbotResponse } from "@/lib/chatbot";
import { getAdminCatalog } from "@/lib/admin-data";
import { getCatalog } from "@/lib/catalog";
import type { ChatbotRequest, ChatbotResponse, Product } from "@/lib/types";

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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatbotRequest;
    const catalog = await getCatalog();
    const response = compactAvailabilityResponse(
      payload.message,
      await buildGeminiChatbotResponse(payload, catalog.products),
    );

    return Response.json(await explainUnavailableProduct(payload, response, catalog.products));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el mensaje.",
      },
      { status: 400 },
    );
  }
}

function compactAvailabilityResponse(message: string, response: ChatbotResponse) {
  if (
    response.suggested_order ||
    response.intent === "complaint" ||
    response.intent === "help" ||
    response.products.length === 0 ||
    !isAvailabilityQuestion(message)
  ) {
    return response;
  }

  return {
    ...response,
    answer: `Si tenemos ${inferAvailabilityLabel(message, response.products)} y estas son nuestras presentaciones disponibles.`,
  };
}

async function explainUnavailableProduct(
  payload: ChatbotRequest,
  response: ChatbotResponse,
  sellableProducts: Product[],
) {
  if (response.products.length > 0) {
    return response;
  }

  const adminCatalog = await getAdminCatalog();
  const sellableIds = new Set(sellableProducts.map((product) => product.id));
  const unavailableProducts = adminCatalog.products.filter(
    (product) => product.is_active && !sellableIds.has(product.id),
  );
  const unavailableMatch = buildChatbotResponse(payload, unavailableProducts);
  const product = unavailableMatch.products[0];

  if (!product) {
    return response;
  }

  const reason = getUnavailableReason(product);
  if (!reason) {
    return response;
  }

  return {
    ...response,
    answer: `Por el momento no hay ${inferAvailabilityLabel(
      payload.message,
      [product],
    )} disponible.`,
    products: [],
  };
}

function isAvailabilityQuestion(message: string) {
  const normalized = normalizeSearchText(message);
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
    products.flatMap((product) => tokenizeSearchText(product.name)),
  );
  const messageTokens = tokenizeSearchText(message).filter(
    (token) => !AVAILABILITY_STOP_WORDS.has(token) && productNameTokens.has(token),
  );

  if (messageTokens.length > 0) {
    return [...new Set(messageTokens)].join(" ");
  }

  return products.length === 1 ? products[0].name : "opciones disponibles";
}

function tokenizeSearchText(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUnavailableReason(product: Product) {
  const today = getCurrentEcuadorDateInput();
  const productExpiration = normalizeDateInput(product.expiration_date);

  if (productExpiration && productExpiration < today) {
    return "porque su fecha de caducidad ya vencio";
  }

  const lots = product.lots ?? [];
  if (lots.length > 0) {
    const hasSellableLot = lots.some((lot) => {
      const quantity = Number(lot.quantity_remaining) || 0;
      const expiration = normalizeDateInput(lot.expiration_date);
      return (
        quantity > 0 &&
        lot.status === "available" &&
        (!expiration || expiration >= today)
      );
    });

    if (!hasSellableLot) {
      return "porque no tiene lotes vigentes disponibles";
    }
  }

  return null;
}

function normalizeDateInput(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function getCurrentEcuadorDateInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Guayaquil",
    year: "numeric",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}
