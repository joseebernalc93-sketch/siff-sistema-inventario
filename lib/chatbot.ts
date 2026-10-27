import type {
  ChatbotHistoryEntry,
  ChatbotRequest,
  ChatbotResponse,
  OrderItemInput,
  Product,
  ProductPresentation,
} from "@/lib/types";
import {
  calculateProductLineTotal,
  formatProductQuantity,
  getEffectiveProductPrice,
  getOrderStockQuantity,
  getProductPresentation,
  getProductPresentations,
  isWeightBasedProduct,
} from "@/lib/pricing";

const KILOGRAM_TO_POUNDS = 2.20462;
const QUINTAL_TO_POUNDS = 100;
const MAX_CHAT_PRODUCTS = 50;
const COUNT_WORD_QUANTITY_PATTERN =
  "un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez";
const WORD_QUANTITY_PATTERN =
  `${COUNT_WORD_QUANTITY_PATTERN}|medio|media|mitad`;

const STOP_WORDS = new Set([
  "a",
  "al",
  "algo",
  "con",
  "cuanto",
  "cuantos",
  "de",
  "del",
  "el",
  "en",
  "esta",
  "estan",
  "hay",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "mi",
  "mis",
  "para",
  "por",
  "que",
  "quiero",
  "si",
  "su",
  "tiene",
  "tienen",
  "todo",
  "todos",
  "tu",
  "tus",
  "un",
  "una",
  "y",
]);

type ChatIntent = {
  catalog: boolean;
  complaint: boolean;
  greeting: boolean;
  help: boolean;
  order: boolean;
  price: boolean;
  stock: boolean;
  thanks: boolean;
};

type ProductMatch = {
  identityMatchedTokens: string[];
  matchedTokenCount: number;
  nameMatchedTokenCount: number;
  product: Product;
  score: number;
  strongMatchedTokenCount: number;
};

type RequestedPresentation = {
  kind: "unit" | "pack" | "named" | "halfQuintal";
  unitQuantity?: number;
  name?: string;
};

export function buildChatbotResponse(
  payload: ChatbotRequest,
  products: Product[],
): ChatbotResponse {
  const message = payload.message.trim();
  const normalized = normalizeText(message);
  const activeProducts = products.filter((product) => product.is_active);
  const intent = detectIntent(normalized);
  const directMatches = findProductMatches(message, activeProducts);
  const contextProducts = getContextProducts(payload.history, activeProducts);
  const isGeneralCatalogRequest = intent.catalog && hasAny(normalized, ["todos", "todo", "catalogo", "completos", "general"]);
  const hasSearchTokens = extractSearchTokens(normalized, activeProducts).length > 0;
  const shouldUseContext =
    !isGeneralCatalogRequest &&
    directMatches.length === 0 &&
    contextProducts.length > 0 &&
    !hasSearchTokens &&
    (intent.price ||
      intent.stock ||
      intent.order ||
      isShortFollowUp(normalized));
  const matches = shouldUseContext ? contextProducts : directMatches;

  if (!message) {
    return {
      intent: "help",
      answer:
        "Escribe el producto que buscas y reviso el catalogo del minimarket. 🛒😃",
      products: [],
    };
  }

  if (intent.greeting) {
    return {
      intent: "help",
      answer: "Hola Bienvenido Jose, estoy aqui para ayudarte a buscar lo que necesitas, que deseas hoy? 👋😃",
      products: [],
    };
  }

  if (intent.thanks) {
    return {
      intent: "help",
      answer: pickReply(normalized, [
        "Con gusto! Cuando necesites otro producto, escríbeme el nombre. 😊",
        "Listo! Si quieres buscar otro producto, aquí estoy. ✨",
        "De nada! Puedo seguir revisando precios o disponibilidad para ti. 🙌",
      ]),
      products: [],
    };
  }

  if (intent.complaint) {
    return {
      intent: "complaint",
      answer:
        "Claro, puedo ayudarte con una queja o devolución. Escribe el número de pedido, el producto y qué ocurrió para enviarlo al administrador. 🙏",
      products: toChatProducts(matches),
    };
  }

  if (activeProducts.length === 0) {
    return {
      intent: "catalog",
      answer:
        "Todavía no veo productos activos en el catálogo 😅. Cuando el administrador agregue inventario, podré consultarlo aquí.",
      products: [],
    };
  }

  if (matches.length === 0) {
    const hasSearchTerms = extractSearchTokens(normalized, activeProducts).length > 0;
    const suggestions = !hasSearchTerms && intent.catalog
      ? pickAvailableProducts(activeProducts)
      : [];
    return {
      intent: "catalog",
      answer: buildNoMatchAnswer(normalized, intent, suggestions),
      products: toChatProducts(suggestions),
    };
  }

  if (!intent.order) {
    const presentationItems = buildRequestedPresentationItems(
      normalized,
      matches,
    );
    return {
      intent: "catalog",
      answer: buildCatalogAnswer({
        intent,
        matches,
        normalized,
        presentationItems,
        usingContext: shouldUseContext,
      }),
      products: toChatProducts(matches),
      ...(presentationItems.length > 0
        ? {
            suggested_order: {
              items: presentationItems,
              total: calculateSuggestedItemsTotal(matches, presentationItems),
            },
          }
        : {}),
    };
  }

  const isMultipleProductOrder = intent.order && isMultiProductRequest(message);
  const orderProducts = selectOrderProducts(normalized, matches);

  if (orderProducts.length > 1 && !isMultipleProductOrder) {
    const optionItems = filterItemsWithEnoughStock(
      orderProducts,
      buildSuggestedItems(normalized, orderProducts),
    );

    return {
      intent: "catalog",
      answer: buildProductChoiceAnswer(normalized, orderProducts, optionItems),
      products: toChatProducts(orderProducts),
      ...(optionItems.length > 0
        ? {
            suggested_order: {
              items: optionItems,
              total: calculateSuggestedItemsTotal(orderProducts, optionItems),
            },
          }
        : {}),
    };
  }

  const items = filterItemsWithEnoughStock(
    orderProducts,
    buildSuggestedItems(normalized, orderProducts),
  );

  if (items.length === 0) {
    const product = orderProducts[0];
    let answer = `Encontre ${product?.name ?? "el producto"}, pero no hay stock suficiente para esa cantidad.`;
    
    if (product) {
      const requestedPresentation = getRequestedPresentation(normalized, orderProducts);
      const requiredQty = requestedPresentation?.unitQuantity;
      const stock = Number(product.stock);
      
      if (stock <= 0) {
        answer = `Encontre ${product.name}, pero lamentablemente se encuentra agotado.`;
      } else {
        if (requiredQty && stock < requiredQty) {
          const stockMsg = formatStockForReply(product, requiredQty, requestedPresentation?.name);
          answer = `Encontre ${product.name}. ${stockMsg.charAt(0).toUpperCase() + stockMsg.slice(1)}.`;
        } else {
          answer = `Encontre ${product.name}, pero no hay stock suficiente para esa cantidad. Puedo ayudarte con una cantidad menor o con otra presentacion disponible.`;
        }
      }
    }

    return {
      intent: "catalog",
      answer,
      products: toChatProducts(orderProducts),
    };
  }

  const total = calculateSuggestedItemsTotal(orderProducts, items);

  return {
    intent: "order",
    answer: buildOrderDraftAnswer(orderProducts, items, total, normalized),
    products: toChatProducts(orderProducts),
    suggested_order: {
      items,
      total,
    },
  };
}

function detectIntent(message: string): ChatIntent {
  const words = new Set(tokenize(message));

  return {
    catalog: hasAny(message, [
      "catalogo",
      "producto",
      "productos",
      "disponible",
      "disponibles",
      "tienen",
      "vende",
      "venden",
      "hay",
      "mostrar",
      "muestrame",
    ]),
    complaint: hasAny(message, [
      "cambiar",
      "cambio",
      "devolucion",
      "malo",
      "problema",
      "queja",
      "reclamo",
      "roto",
    ]),
    greeting:
      words.size > 0 &&
      [...words].every((word) =>
        ["buenas", "buenos", "dias", "hola", "saludos", "tardes"].includes(
          word,
        ),
      ),
    help: hasAny(message, ["ayuda", "ayudame", "como", "puedes"]),
    order: hasAny(message, [
      "agrega",
      "agregar",
      "comprar",
      "dame",
      "llevar",
      "necesito",
      "pedido",
      "quiero",
      "reservar",
    ]),
    price: hasAny(message, [
      "cuesta",
      "cuestan",
      "precio",
      "precios",
      "vale",
      "valen",
      "valor",
    ]),
    stock: hasAny(message, [
      "disponible",
      "disponibles",
      "hay",
      "queda",
      "quedan",
      "stock",
      "tiene",
      "tienen",
    ]),
    thanks:
      words.size > 0 &&
      [...words].every((word) => ["gracias", "ok", "listo"].includes(word)),
  };
}

function buildNoMatchAnswer(
  message: string,
  intent: ChatIntent,
  suggestions: Product[],
) {
  if (intent.catalog || !extractSearchTokens(message).length) {
    if (suggestions.length === 0) {
      if (intent.price) {
        return "Claro! Dime el nombre del producto y te digo el precio. 💵";
      }

      if (intent.stock) {
        return "Claro! Dime qué producto quieres revisar y consulto el stock. 📦";
      }

      return "Dime el producto que buscas y reviso el catálogo. 🛒";
    }

    return `Puedo mostrarte ${suggestions.length} productos disponibles ✨. Si buscas algo puntual, escribe el nombre, marca o presentación.`;
  }

  return pickReply(message, [
    "Hmm, ese producto no se encuentra disponible en el inventario 😕. Puedes escribir otro producto para revisarlo.",
    "No tengo ese producto disponible por ahora 🙈. Escribe otro nombre o marca y lo busco en el inventario.",
    "Ese producto no aparece disponible en el catálogo. Si deseas, prueba con otro producto. 🛍️",
  ]);
}

function buildCatalogAnswer({
  intent,
  matches,
  normalized,
  presentationItems,
  usingContext,
}: {
  intent: ChatIntent;
  matches: Product[];
  normalized: string;
  presentationItems: OrderItemInput[];
  usingContext: boolean;
}) {
  if (matches.length === 1) {
    const product = matches[0];
    const selectedItem = presentationItems.find(
      (item) => item.product_id === product.id,
    );
    const price = getEffectiveProductPrice(
      product,
      selectedItem?.presentation_id,
    );
    const priceText = `$${price.unitPrice.toFixed(2)} por ${price.label.toLowerCase()}`;
    const requestedPresentation = getRequestedPresentation(normalized, matches);
    const stockText = formatStockForReply(
      product,
      requestedPresentation?.unitQuantity,
      requestedPresentation?.name
    );
    const prefix = usingContext
      ? `Sobre ${product.name}:`
      : `Si, tengo ${product.name}.`;

    if (intent.price) {
      return `${prefix} esta a ${priceText}. ${stockText}.`;
    }

    if (intent.stock) {
      return `${prefix} ${stockText}. El precio es ${priceText}.`;
    }

    return pickReply(normalized, [
      `${prefix} Esta a ${priceText} y ${stockText.toLowerCase()}.`,
      `${prefix} Te muestro el detalle en la tarjeta: ${priceText}, ${stockText.toLowerCase()}.`,
      `${prefix} Disponible para revisar. Precio: ${priceText}; ${stockText.toLowerCase()}.`,
    ]);
  }

  const allOutOfStock = matches.every(p => Number(p.stock) <= 0);

  const requestedPresentation = getRequestedPresentation(normalized, matches);
  if (requestedPresentation && presentationItems.length > 0) {
    const presentationLabel = getCommonPresentationLabel(
      matches,
      presentationItems,
    );
    const hasSufficientStock = matches.some(p => {
      const rq = requestedPresentation.unitQuantity;
      return rq ? Number(p.stock) >= rq : true;
    });

    if (allOutOfStock) {
      return `Encontre ${matches.length} opciones en presentacion ${presentationLabel}, pero actualmente todas se encuentran agotadas.`;
    }
    if (!hasSufficientStock) {
      return `Encontre ${matches.length} opciones. No tenemos ${presentationLabel} completo, pero sí hay algunas libras o unidades disponibles de estas opciones.`;
    }
    return `Encontre ${matches.length} opciones en presentacion ${presentationLabel}. Cada tarjeta muestra el precio exacto de esa presentacion.`;
  }

  if (allOutOfStock) {
    if (intent.stock) {
      return `Encontre ${matches.length} opciones relacionadas, pero lamentablemente todas se encuentran agotadas en este momento.`;
    }
    return `Encontre ${matches.length} opciones en el catalogo, pero actualmente todas estan agotadas.`;
  }

  if (intent.price) {
    return `Encontre ${matches.length} opciones. Te dejo las tarjetas con precio por unidad o libra para que compares.`;
  }

  if (intent.stock) {
    return `Encontre ${matches.length} opciones relacionadas y las tarjetas muestran si estan disponibles.`;
  }

  return pickReply(normalized, [
    `Encontre ${matches.length} opciones relacionadas. Puedes escribir una marca o presentacion para afinar mas.`,
    `Tengo ${matches.length} coincidencias posibles. Mira las tarjetas y dime cual quieres revisar.`,
    `Te muestro ${matches.length} resultados cercanos. Si buscas uno exacto, agrega marca o tamano.`,
  ]);
}

function buildProductChoiceAnswer(
  message: string,
  products: Product[],
  items: OrderItemInput[],
) {
  const allOutOfStock = products.every(p => Number(p.stock) <= 0);
  const requestedPresentation = getRequestedPresentation(message, products);
  const presentationLabel = requestedPresentation
    ? getCommonPresentationLabel(products, items)
    : null;

  if (allOutOfStock) {
    if (presentationLabel) {
      return `Encontré ${products.length} opciones en presentación ${presentationLabel}, pero lamentablemente se encuentran agotadas. 😞`;
    }
    return `Encontré ${products.length} opciones en el catálogo, pero actualmente todas se encuentran agotadas en este momento. 😞`;
  }

  if (presentationLabel) {
    return `Encontré ${products.length} opciones en presentación ${presentationLabel} ✨. Elige la que prefieras y pulsa Agregar; cada tarjeta muestra el precio correcto.`;
  }

  return `Encontré ${products.length} opciones relacionadas 😃. Elige la que prefieras y pulsa Agregar para incluirla en tu pedido.`;
}

function buildOrderDraftAnswer(
  products: Product[],
  items: OrderItemInput[],
  total: number,
  message: string,
) {
  const firstProduct = products[0];
  const firstItem = items[0];

  if (products.length === 1 && firstProduct && firstItem) {
    const productItems = items.filter((item) => item.product_id === firstProduct.id);
    const quantityLabel = formatOrderItemsQuantity(
      firstProduct,
      productItems,
      message,
    );
    const productName = getOrderProductDisplayName(firstProduct);

    return `Encontre ${quantityLabel} de ${productName}. Total estimado: $${total.toFixed(
      2,
    )}. Confirma con el boton Agregar para incluirlo en tu pedido.`;
  }

  const skippedProducts = products.filter(
    (product) => !items.some((item) => item.product_id === product.id),
  );
  const itemCountLabel =
    items.length === 1 ? "1 producto" : `${items.length} productos`;
  const skippedText =
    skippedProducts.length > 0
      ? ` No inclui ${formatProductNames(skippedProducts)} porque no hay stock suficiente.`
      : "";

  return `Listo, arme una propuesta con ${itemCountLabel} para agregar. Total estimado: $${total.toFixed(
    2,
  )}.${skippedText}`;
}

function formatProductNames(products: Product[]) {
  const names = products.map((product) => getOrderProductDisplayName(product));

  if (names.length <= 1) {
    return names[0] ?? "el producto";
  }

  if (names.length === 2) {
    return names.join(" y ");
  }

  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function formatOrderItemsQuantity(
  product: Product,
  items: OrderItemInput[],
  message = "",
) {
  if (items.length <= 1) {
    return formatOrderQuantity(product, items[0], message);
  }

  return items
    .map((item) => formatOrderQuantity(product, item, message))
    .join(" + ");
}

function getOrderProductDisplayName(product: Product) {
  return isWeightBasedProduct(product)
    ? product.name.replace(/\s+100\s*lb\s*$/i, "").trim()
    : product.name;
}

function toChatProducts(products: Product[]) {
  return products.map((product) => ({
    ...product,
    description: product.description ? product.description.slice(0, 180) : null,
    image_url: getChatImageUrl(product.image_url),
  }));
}

function getChatImageUrl(imageUrl: string | null) {
  const normalized = imageUrl?.trim();

  if (!normalized || normalized.startsWith("data:")) {
    return null;
  }

  return normalized;
}

function findProductMatches(message: string, products: Product[]) {
  const requestPhrases = splitProductRequestPhrases(message, products);
  if (requestPhrases.length > 1) {
    const matches = findMultiProductMatches(requestPhrases, products);
    if (matches.length > 0) {
      return matches.slice(0, MAX_CHAT_PRODUCTS);
    }
  }

  const normalizedMessage = normalizeText(message);
  const requestedPresentation = getRequestedPresentation(normalizedMessage, products);
  const queryTokens = extractSearchTokens(normalizedMessage, products);
  const eligibleProducts = requestedPresentation
    ? products.filter((product) => {
        if (findRequestedProductPresentation(product, requestedPresentation)) {
          return true;
        }
        const name = normalizeText(product.name);
        if (requestedPresentation.kind === "named" && requestedPresentation.name) {
          return name.includes(requestedPresentation.name);
        }
        if (requestedPresentation.kind === "pack") {
          return /\b(?:pack|six[-\s]?pack)\b/.test(name);
        }
        if (requestedPresentation.kind === "unit") {
          return /\bunidad(?:es)?\b/.test(name);
        }
        return false;
      })
    : products;

  if (queryTokens.length === 0) {
    return requestedPresentation
      ? pickAvailableProducts(eligibleProducts)
      : [];
  }

  const scoredMatches = eligibleProducts.map((product) =>
    scoreProductMatch(normalizedMessage, queryTokens, product),
  );
  const filteredMatches = preferProductIdentityMatches(scoredMatches);
  const preciseMatches = preferDistinctiveIdentityTokenMatches(
    filteredMatches,
    queryTokens,
    eligibleProducts,
  );

  return preciseMatches
    .filter(
      (match) =>
        match.score >= 18 &&
        match.matchedTokenCount > 0,
    )
    .sort((first, second) => second.score - first.score)
    .slice(0, MAX_CHAT_PRODUCTS)
    .map((match) => match.product);
}

function findMultiProductMatches(phrases: string[], products: Product[]) {
  const matches: Product[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const phraseMatches = findSinglePhraseMatches(phrase, products);
    const selectedProduct = phraseMatches[0];

    if (selectedProduct && !seen.has(selectedProduct.id)) {
      matches.push(selectedProduct);
      seen.add(selectedProduct.id);
    }
  }

  return matches;
}

function findSinglePhraseMatches(phrase: string, products: Product[]) {
  const normalizedPhrase = normalizeText(phrase);
  const requestedPresentation = getRequestedPresentation(normalizedPhrase, products);
  const queryTokens = extractSearchTokens(normalizedPhrase, products);

  if (queryTokens.length === 0) {
    return [];
  }

  const eligibleProducts = requestedPresentation
    ? products.filter((product) => {
        if (findRequestedProductPresentation(product, requestedPresentation)) {
          return true;
        }

        const name = normalizeText(product.name);
        if (requestedPresentation.kind === "named" && requestedPresentation.name) {
          return name.includes(requestedPresentation.name);
        }

        if (requestedPresentation.kind === "pack") {
          return /\b(?:pack|six[-\s]?pack)\b/.test(name);
        }

        if (requestedPresentation.kind === "unit") {
          return /\bunidad(?:es)?\b/.test(name);
        }

        return false;
      })
    : products;

  const scoredMatches = eligibleProducts
    .map((product) => scoreProductMatch(normalizedPhrase, queryTokens, product))
    .filter((match) => match.score >= 18 && match.matchedTokenCount > 0);
  const filteredMatches = preferProductIdentityMatches(scoredMatches);
  const preciseMatches = preferDistinctiveIdentityTokenMatches(
    filteredMatches,
    queryTokens,
    eligibleProducts,
  );

  return preciseMatches
    .sort((first, second) => second.score - first.score)
    .map((match) => match.product);
}

function isMultiProductRequest(message: string) {
  return splitProductRequestPhrases(message).length > 1;
}

function splitProductRequestPhrases(message: string, products: Product[] = []) {
  const normalizedForList = normalizeTextKeepingListSeparators(message)
    .replace(
      /\b(?:quiero|quisiera|necesito|dame|agrega|agregar|comprar|llevar|reservar|pedido|pedir|por favor)\b/g,
      " ",
    )
    .replace(/\s+y\s+(?=(?:medio|media|mitad)\b)/g, " mas ")
    .replace(
      /\s+y\s+(?=\d+(?:[\.,]\d+)?\s*(?:unidad(?:es)?|unds?|uds?|litro(?:s)?|lts?|botella(?:s)?|funda(?:s)?|lata(?:s)?|lbs?|libras?|kg|kilos?)\b)/g,
      " mas ",
    )
    .replace(/\s+(?:tambien|ademas)\s+/g, ",")
    .replace(/\s+y\s+(?=(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d))/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedForList
    .split(/[;,]+/)
    .flatMap((part) =>
      part
        .trim()
        .split(
          /\s+(?=(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+(?:[\.,]\d+)?)\s+(?!(?:unidad(?:es)?|unds?|uds?|litro(?:s)?|lts?|botella(?:s)?|funda(?:s)?|lata(?:s)?|lbs?|libras?|kg|kilos?)\b))/,
        ),
    )
    .map((part) => part.trim())
    .filter((part) => extractSearchTokens(part, products).length > 0);
}

function scoreProductMatch(
  message: string,
  queryTokens: string[],
  product: Product,
): ProductMatch {
  const normalizedName = normalizeText(product.name);
  const normalizedSku = normalizeText(product.sku);
  const normalizedProvider = normalizeText(product.provider ?? "");
  const normalizedCategory = normalizeText(product.categories?.name ?? "");
  const identityHaystack = [normalizedName, normalizedSku]
    .filter(Boolean)
    .join(" ");
  const strongHaystack = [
    normalizedName,
    normalizedSku,
    normalizeText(product.description ?? ""),
    normalizedProvider,
  ]
    .filter(Boolean)
    .join(" ");
  const haystack = [
    normalizedName,
    normalizedSku,
    normalizeText(product.description ?? ""),
    normalizedProvider,
    normalizedCategory,
  ]
    .filter(Boolean)
    .join(" ");
  const haystackTokens = tokenize(haystack);
  const nameTokens = tokenize(normalizedName);
  const matchedTokenCount = queryTokens.filter((token) =>
    textIncludesSearchToken(haystack, token),
  ).length;
  const identityMatchedTokens = queryTokens.filter((token) =>
    textIncludesSearchToken(identityHaystack, token),
  );
  const nameMatchedTokenCount = queryTokens.filter((token) =>
    textIncludesSearchToken(identityHaystack, token),
  ).length;
  const strongMatchedTokenCount = queryTokens.filter((token) =>
    textIncludesSearchToken(strongHaystack, token),
  ).length;
  let score = 0;

  if (normalizedName && message.includes(normalizedName)) {
    score += 130;
  }

  if (normalizedSku && message.includes(normalizedSku)) {
    score += 120;
  }

  const compactMessage = message.replace(/\s+/g, "");
  const compactName = normalizedName.replace(/\s+/g, "");
  if (compactName.length > 4 && compactMessage.includes(compactName)) {
    score += 70;
  }

  for (const token of queryTokens) {
    if (textIncludesSearchToken(normalizedSku, token)) {
      score += 30;
    }

    if (nameTokens.includes(token)) {
      score += 26;
      continue;
    }

    if (textIncludesSearchToken(normalizedName, token)) {
      score += 20;
      continue;
    }

    if (textIncludesSearchToken(normalizedProvider, token)) {
      score += 14;
      continue;
    }

    if (textIncludesSearchToken(normalizedCategory, token)) {
      score += 12;
      continue;
    }

    if (haystackTokens.includes(token)) {
      score += 10;
      continue;
    }

    const bestSimilarity = Math.max(
      ...nameTokens.map((nameToken) => tokenSimilarity(token, nameToken)),
      0,
    );
    if (bestSimilarity >= 0.82) {
      score += 15;
    } else if (bestSimilarity >= 0.72 && token.length >= 5) {
      score += 8;
    }
  }

  if (queryTokens.length > 1) {
    const matchedTokenCount = queryTokens.filter((token) =>
      textIncludesSearchToken(haystack, token),
    ).length;
    score += matchedTokenCount * 6;
  }

  return {
    identityMatchedTokens,
    matchedTokenCount,
    nameMatchedTokenCount,
    product,
    score,
    strongMatchedTokenCount,
  };
}

function preferDistinctiveIdentityTokenMatches(
  matches: ProductMatch[],
  queryTokens: string[],
  products: Product[],
) {
  if (matches.length <= 1 || queryTokens.length <= 1) {
    return matches;
  }

  const identityTokenFrequency = new Map<string, number>();
  for (const token of queryTokens) {
    const frequency = products.filter((product) => {
      const identityHaystack = [
        normalizeText(product.name),
        normalizeText(product.sku),
      ]
        .filter(Boolean)
        .join(" ");

      return textIncludesSearchToken(identityHaystack, token);
    }).length;

    if (frequency > 0) {
      identityTokenFrequency.set(token, frequency);
    }
  }

  if (identityTokenFrequency.size === 0) {
    return matches;
  }

  const rarestFrequency = Math.min(...identityTokenFrequency.values());
  const distinctiveTokens = [...identityTokenFrequency.entries()]
    .filter(([, frequency]) => frequency === rarestFrequency)
    .map(([token]) => token);
  const preciseMatches = matches.filter((match) =>
    distinctiveTokens.every((token) =>
      match.identityMatchedTokens.includes(token),
    ),
  );

  return preciseMatches.length > 0 ? preciseMatches : matches;
}

function preferProductIdentityMatches(matches: ProductMatch[]) {
  const nameMatches = matches.filter((match) => match.nameMatchedTokenCount > 0);
  if (nameMatches.length > 0) {
    const maxNameTokens = Math.max(
      ...nameMatches.map((match) => match.nameMatchedTokenCount),
    );
    const bestNameMatches = nameMatches.filter(
      (match) => match.nameMatchedTokenCount === maxNameTokens,
    );
    const maxMatchedTokens = Math.max(
      ...bestNameMatches.map((match) => match.matchedTokenCount),
    );

    return bestNameMatches.filter(
      (match) => match.matchedTokenCount === maxMatchedTokens,
    );
  }

  const strongMatches = matches.filter(
    (match) => match.strongMatchedTokenCount > 0,
  );
  if (strongMatches.length > 0) {
    const maxStrongTokens = Math.max(
      ...strongMatches.map((match) => match.strongMatchedTokenCount),
    );
    const bestStrongMatches = strongMatches.filter(
      (match) => match.strongMatchedTokenCount === maxStrongTokens,
    );
    const maxMatchedTokens = Math.max(
      ...bestStrongMatches.map((match) => match.matchedTokenCount),
    );

    return bestStrongMatches.filter(
      (match) => match.matchedTokenCount === maxMatchedTokens,
    );
  }

  const maxMatchedTokens = Math.max(
    ...matches.map((match) => match.matchedTokenCount),
    0,
  );
  return matches.filter(
    (match) => match.matchedTokenCount === maxMatchedTokens,
  );
}

function textIncludesSearchToken(text: string, token: string) {
  if (!text || !token) {
    return false;
  }

  const textTokens = tokenize(text);
  return getSearchTokenVariants(token).some((variant) =>
    textTokens.some(
      (t) =>
        t === variant ||
        t.startsWith(variant) ||
        getSearchTokenVariants(t).includes(variant),
    ),
  );
}

function getSearchTokenVariants(token: string) {
  const variants = new Set([token]);

  if (token.length > 3 && token.endsWith("es")) {
    variants.add(token.slice(0, -2));
  }

  if (token.length > 3 && token.endsWith("s")) {
    variants.add(token.slice(0, -1));
  }

  if (token.length > 3 && !token.endsWith("s")) {
    variants.add(`${token}s`);
    variants.add(`${token}es`);
  }

  return Array.from(variants).filter((variant) => variant.length > 1);
}

function pickAvailableProducts(products: Product[]) {
  return [...products]
    .sort((first, second) => {
      const firstStock = Number(first.stock) > 0 ? 1 : 0;
      const secondStock = Number(second.stock) > 0 ? 1 : 0;

      if (firstStock !== secondStock) {
        return secondStock - firstStock;
      }

      return first.name.localeCompare(second.name);
    })
    .slice(0, 50); // Aumentado a 50 para que muestre muchos más productos del inventario
}

function getContextProducts(
  history: ChatbotHistoryEntry[] | undefined,
  products: Product[],
) {
  if (!history?.length) {
    return [];
  }

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const contextProducts: Product[] = [];
  const seen = new Set<string>();

  for (const entry of [...history].reverse()) {
    for (const productId of entry.product_ids ?? []) {
      const product = productsById.get(productId);
      if (product && !seen.has(product.id)) {
        contextProducts.push(product);
        seen.add(product.id);
      }

      if (contextProducts.length >= 3) {
        return contextProducts;
      }
    }
  }

  return contextProducts;
}

function buildSuggestedItems(
  message: string,
  products: Product[],
): OrderItemInput[] {
  return products.flatMap((product) =>
    buildSuggestedItemsForProduct(getMessageForProduct(message, product), product),
  );
}

function buildSuggestedItemsForProduct(
  message: string,
  product: Product,
): OrderItemInput[] {
  const mixedItems = buildMixedPresentationItems(message, product);
  return mixedItems ?? [buildSuggestedItem(message, product)];
}

function getMessageForProduct(message: string, product: Product) {
  const requestPhrases = splitProductRequestPhrases(message);

  if (requestPhrases.length <= 1) {
    return message;
  }

  return (
    requestPhrases.find((phrase) =>
      findSinglePhraseMatches(phrase, [product]).some(
        (match) => match.id === product.id,
      ),
    ) ?? message
  );
}

function buildRequestedPresentationItems(
  message: string,
  products: Product[],
) {
  if (!getRequestedPresentation(message, products)) {
    return [];
  }

  return filterItemsWithEnoughStock(products, buildSuggestedItems(message, products));
}

function selectOrderProducts(message: string, products: Product[]) {
  if (products.length <= 1) {
    return products;
  }

  if (isMultiProductRequest(message)) {
    return products;
  }

  const asksForWeight = hasAny(message, [
    "lb",
    "lbs",
    "libra",
    "libras",
    "qq",
    "quintal",
    "quintales",
    "kg",
    "kilo",
    "kilos",
  ]);

  if (!asksForWeight) {
    return products;
  }

  const requestedPresentation = getRequestedPresentation(message, products);
  const firstProduct = products[0];

  if (
    firstProduct &&
    (productSupportsWeightRequest(firstProduct, requestedPresentation) ||
      (requestedPresentation &&
        findRequestedProductPresentation(firstProduct, requestedPresentation)))
  ) {
    return [firstProduct];
  }

  const preferred = products.find(
    (product) =>
      (requestedPresentation &&
        findRequestedProductPresentation(product, requestedPresentation)) ||
      productSupportsWeightRequest(product, requestedPresentation),
  );

  return preferred ? [preferred] : products.slice(0, 1);
}

function productSupportsWeightRequest(
  product: Product,
  request?: RequestedPresentation | null,
) {
  if (isWeightBasedProduct(product)) {
    return true;
  }

  const presentations = getProductPresentations(product);
  if (request && findRequestedProductPresentation(product, request)) {
    return true;
  }

  return presentations.some((presentation) => {
    const name = normalizeText(presentation.name);

    return (
      presentation.is_active !== false &&
      presentation.use_for_sale !== false &&
      (name.includes("quintal") ||
        name === "lb" ||
        name.includes("libra") ||
        Math.abs(Number(presentation.unit_quantity) - QUINTAL_TO_POUNDS) <
          0.001 ||
        Math.abs(Number(presentation.unit_quantity) - 1) < 0.001)
    );
  });
}

function buildSuggestedItem(
  message: string,
  product: Product,
): OrderItemInput {
  const presentationRequest = getRequestedPresentation(message, [product]);
  const requestedPresentation = presentationRequest
    ? findRequestedProductPresentation(product, presentationRequest)
    : null;
  let requestedQuantity = extractQuantityForProduct(message, product, presentationRequest);

  if (
    requestedPresentation &&
    isWeightBasedProduct(product) &&
    hasExplicitWeightUnit(message) &&
    requestedPresentation.unit_quantity > 0
  ) {
    requestedQuantity = Number(
      (requestedQuantity / requestedPresentation.unit_quantity).toFixed(3),
    );
  }

  if (
    requestedPresentation &&
    presentationRequest?.kind === "pack" &&
    isPresentationQuantityOnly(message, presentationRequest.unitQuantity!) &&
    Math.abs(requestedQuantity - presentationRequest.unitQuantity!) < 0.001
  ) {
    requestedQuantity = 1;
  }

  if (requestedPresentation) {
    if (presentationRequest?.kind === "halfQuintal") {
      return {
        product_id: product.id,
        presentation_id: requestedPresentation.id,
        quantity:
          Math.abs(requestedPresentation.unit_quantity - (QUINTAL_TO_POUNDS / 2)) <
          0.001
            ? 1
            : 0.5,
      };
    }

    return {
      product_id: product.id,
      presentation_id: requestedPresentation.id,
      quantity: requestedQuantity,
    };
  }

  if (!isWeightBasedProduct(product)) {
    return { product_id: product.id, quantity: requestedQuantity };
  }

  const presentations = getProductPresentations(product);
  const exactPresentation = presentations.find(
    (presentation) =>
      Math.abs(presentation.unit_quantity - requestedQuantity) < 0.001,
  );

  if (exactPresentation) {
    return {
      product_id: product.id,
      presentation_id: exactPresentation.id,
      quantity: 1,
    };
  }

  const poundPresentation =
    presentations.find(
      (presentation) => Math.abs(presentation.unit_quantity - 1) < 0.001,
    ) ?? getProductPresentation(product);

  return {
    product_id: product.id,
    presentation_id: poundPresentation?.id,
    quantity: requestedQuantity,
  };
}

function hasEnoughStock(products: Product[], item: OrderItemInput) {
  const product = products.find((entry) => entry.id === item.product_id);
  return Boolean(
    product &&
      getOrderStockQuantity(product, item.quantity, item.presentation_id) <=
        Number(product.stock) + 0.001,
  );
}

function filterItemsWithEnoughStock(
  products: Product[],
  items: OrderItemInput[],
) {
  const requiredStockByProduct = new Map<string, number>();

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.product_id);
    if (!product) {
      continue;
    }

    requiredStockByProduct.set(
      item.product_id,
      (requiredStockByProduct.get(item.product_id) ?? 0) +
        getOrderStockQuantity(product, item.quantity, item.presentation_id),
    );
  }

  const allowedProductIds = new Set(
    products
      .filter((product) => {
        const requiredStock = requiredStockByProduct.get(product.id);
        return (
          requiredStock === undefined ||
          requiredStock <= Number(product.stock) + 0.001
        );
      })
      .map((product) => product.id),
  );

  return items.filter(
    (item) => allowedProductIds.has(item.product_id) && hasEnoughStock(products, item),
  );
}

function calculateSuggestedItemsTotal(
  products: Product[],
  items: OrderItemInput[],
) {
  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    const ivaMultiplier =
      product?.has_iva && product.iva_rate ? 1 + product.iva_rate / 100 : 1;

    return (
      sum +
      (product
        ? calculateProductLineTotal(
            product,
            item.quantity,
            item.presentation_id,
          ) * ivaMultiplier
        : 0)
    );
  }, 0);

  return Number(total.toFixed(2));
}

function getRequestedPresentation(
  message: string,
  products: Product[],
): RequestedPresentation | null {
  if (isHalfQuintalRequest(message)) {
    return {
      kind: "halfQuintal",
      name: "medio quintal",
      unitQuantity: QUINTAL_TO_POUNDS / 2,
    };
  }

  const presentationNames = new Map<string, number>();
  for (const product of products) {
    if (!product.presentations) continue;
    for (const p of product.presentations) {
      if (p.is_active !== false && p.use_for_sale !== false && p.name) {
        const name = normalizeText(p.name);
        const currentQuantity = presentationNames.get(name) ?? 0;
        presentationNames.set(
          name,
          Math.max(currentQuantity, Number(p.unit_quantity) || 1),
        );
      }
    }
  }

  const candidates = Array.from(presentationNames.entries())
    .map(([name, unitQuantity]) => {
      const pattern = buildPresentationNamePattern(name);
      const regex = new RegExp(pattern);
      if (!regex.test(message)) {
        return null;
      }

      return {
        name,
        unitQuantity,
        hasExplicitQuantity: hasExplicitPresentationQuantity(message, pattern),
        wordCount: name.split(/\s+/).filter(Boolean).length,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    )
    .sort((first, second) => {
      if (first.wordCount !== second.wordCount) {
        return second.wordCount - first.wordCount;
      }

      if (first.hasExplicitQuantity !== second.hasExplicitQuantity) {
        return first.hasExplicitQuantity ? -1 : 1;
      }

      const firstIsBulk = first.unitQuantity > 1.001;
      const secondIsBulk = second.unitQuantity > 1.001;
      if (firstIsBulk !== secondIsBulk) {
        return firstIsBulk ? -1 : 1;
      }

      return second.unitQuantity - first.unitQuantity || second.name.length - first.name.length;
    });

  const bulkCandidate = candidates.find(
    (candidate) => candidate.unitQuantity > 1.001,
  );
  if (bulkCandidate) {
    return { kind: "named", name: bulkCandidate.name };
  }

  if (/\bsix[-\s]?packs?\b/.test(message)) {
    return { kind: "pack", unitQuantity: 6 };
  }

  if (candidates[0]) {
    return { kind: "named", name: candidates[0].name };
  }

  if (
    /\b(?:por|en|presentacion(?:\s+de)?)\s+unidad(?:es)?\b/.test(message)
  ) {
    return { kind: "unit", unitQuantity: 1 };
  }

  if (/\bsix[-\s]?packs?\b/.test(message)) {
    return { kind: "pack", unitQuantity: 6 };
  }

  const numericPatterns = [
    /\bpresentacion(?:\s+de)?\s+(\d+)\b/,
    /\b(\d+)\s*[-\s]?packs?\b/,
    /\bpacks?\s*(?:de|x)?\s*(\d+)\b/,
  ];

  for (const pattern of numericPatterns) {
    const match = message.match(pattern);
    const unitQuantity = Number(match?.[1]);
    if (Number.isFinite(unitQuantity) && unitQuantity > 1) {
      return { kind: "pack", unitQuantity };
    }
  }

  return null;
}

function findRequestedProductPresentation(
  product: Product,
  request: RequestedPresentation,
) {
  const presentations = getProductPresentations(product);

  if (request.kind === "halfQuintal") {
    return (
      presentations.find((presentation) => {
        const name = normalizeText(presentation.name);
        return (
          name.includes("medio quintal") ||
          Math.abs(presentation.unit_quantity - (QUINTAL_TO_POUNDS / 2)) < 0.001
        );
      }) ??
      presentations.find((presentation) => {
        const name = normalizeText(presentation.name);
        return (
          name.includes("quintal") ||
          Math.abs(presentation.unit_quantity - QUINTAL_TO_POUNDS) < 0.001
        );
      }) ??
      null
    );
  }

  if (request.kind === "named" && request.name) {
    return (
      presentations.find(
        (presentation) => normalizeText(presentation.name) === request.name,
      ) ?? null
    );
  }

  const quantityMatches = presentations.filter(
    (presentation) =>
      Math.abs(presentation.unit_quantity - (request.unitQuantity ?? 1)) < 0.001,
  );

  if (request.kind === "unit") {
    return (
      quantityMatches.find((presentation) =>
        /\bunidad(?:es)?\b/.test(normalizeText(presentation.name)),
      ) ?? quantityMatches[0]
    );
  }

  return (
    quantityMatches.find((presentation) =>
      /\b(?:pack|six[-\s]?pack)\b/.test(normalizeText(presentation.name)),
    ) ?? quantityMatches[0]
  );
}

function isHalfQuintalRequest(message: string) {
  return (
    /\b(?:medio|media|mitad)\s+(?:qq|quintal(?:es)?)\b/.test(message) ||
    /\b(?:qq|quintal(?:es)?)\s+(?:y\s+|con\s+)?(?:medio|media|mitad)\b/.test(
      message,
    )
  );
}

function isPresentationQuantityOnly(message: string, unitQuantity: number) {
  const quantity = String(unitQuantity);
  return (
    new RegExp(`\\bpresentacion(?:\\s+de)?\\s+${quantity}\\b`).test(
      message,
    ) ||
    new RegExp(`\\b${quantity}\\s*[-\\s]?packs?\\b`).test(message) ||
    new RegExp(`\\bpacks?\\s*(?:de|x)?\\s*${quantity}\\b`).test(message)
  );
}

function getCommonPresentationLabel(
  products: Product[],
  items: OrderItemInput[],
) {
  for (const item of items) {
    const product = products.find((entry) => entry.id === item.product_id);
    const presentation = product
      ? getProductPresentation(product, item.presentation_id)
      : null;
    if (presentation?.name) {
      return presentation.name;
    }
  }

  return "solicitada";
}

function extractQuantityForProduct(
  message: string,
  product: Product,
  requestedPresentation: RequestedPresentation | null = null,
) {
  const mixedWeightQuantity = extractMixedWeightQuantity(message, product);
  if (mixedWeightQuantity !== null) {
    return mixedWeightQuantity;
  }

  const normalizedName = normalizeText(product.name);
  const productTokens = tokenize(normalizedName).filter(
    (word) => word.length > 2,
  );
  const firstProductToken = productTokens[0] ?? "";
  const numberPattern = "(\\d+(?:[\\.,]\\d+)?)";

  let searchMessageForWordQuantity = message;
  if (requestedPresentation && requestedPresentation.kind === "named" && requestedPresentation.name) {
    const parts = requestedPresentation.name
      .split(/\s+/)
      .map(p => p.replace(/(\d+)([a-zA-Z]+)/g, "$1\\s*$2"));
    for (const part of parts) {
      searchMessageForWordQuantity = searchMessageForWordQuantity.replace(
        new RegExp(`\\b${part}(?:s|es)?\\b`, "g"),
        ""
      );
    }
  }
  const wordQuantity = extractWordQuantity(searchMessageForWordQuantity);
  
  let quantity = 1;
  const explicitPackCount = message.match(
    /\b(\d+(?:[\.,]\d+)?)\s+six[-\s]?packs?\b/,
  );

  let explicitNamedCount: number | null = null;
  if (!explicitPackCount) {
    const presentations = getProductPresentations(product);
    for (const p of presentations) {
      if (p.name) {
        const name = normalizeText(p.name);
        const parts = name.split(/\s+/).map(p => p.replace(/(\d+)([a-zA-Z]+)/g, "$1\\s*$2"));
        const firstPart = parts[0];
        const match = message.match(
          new RegExp(`\\b(\\d+(?:[\\.,]\\d+)?)\\s+${firstPart}(?:s|es)?\\b`),
        );
        if (match?.[1]) {
          explicitNamedCount = Number.parseFloat(match[1].replace(",", "."));
          break;
        }
      }
    }
  }

  if (explicitPackCount?.[1]) {
    quantity = Number.parseFloat(explicitPackCount[1].replace(",", "."));
  } else if (explicitNamedCount !== null) {
    quantity = explicitNamedCount;
  } else if (firstProductToken) {
    const directPattern = new RegExp(
      `${numberPattern}\\s+(?:\\w+\\s+){0,3}${firstProductToken}`,
    );
    const reversePattern = new RegExp(
      `${firstProductToken}(?:\\s+\\w+){0,4}\\s+${numberPattern}`,
    );
    const directMatch = searchMessageForWordQuantity.match(directPattern);
    const reverseMatch = searchMessageForWordQuantity.match(reversePattern);
    const rawQuantity = directMatch?.[1] ?? reverseMatch?.[1];
    if (rawQuantity) {
      quantity = Number.parseFloat(rawQuantity.replace(",", "."));
    } else if (wordQuantity) {
      quantity = wordQuantity;
    }
  } else if (wordQuantity) {
    quantity = wordQuantity;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    quantity = 1;
  }

  if (isWeightBasedProduct(product) && !requestedPresentation) {
    if (hasAny(message, ["qq", "quintal", "quintales"])) {
      return Number((quantity * QUINTAL_TO_POUNDS).toFixed(3));
    }

    if (hasAny(message, ["kg", "kilo", "kilos"])) {
      return Number((quantity * KILOGRAM_TO_POUNDS).toFixed(3));
    }

    return Number(quantity.toFixed(3));
  }

  if (
    requestedPresentation &&
    Math.abs(quantity - Math.round(quantity)) >= 0.001
  ) {
    return Number(quantity.toFixed(3));
  }

  return Math.max(1, Math.round(quantity));
}

function buildMixedPresentationItems(
  message: string,
  product: Product,
) {
  const presentationRequest = getRequestedPresentation(message, [product]);
  const requestedPresentation = presentationRequest
    ? findRequestedProductPresentation(product, presentationRequest)
    : null;
  const mixedQuantity = extractMixedPresentationParts(
    message,
    product,
    presentationRequest,
    requestedPresentation,
  );

  if (!mixedQuantity || !requestedPresentation) {
    return null;
  }

  const items: OrderItemInput[] = [];
  if (mixedQuantity.presentationQuantity > 0.001) {
    items.push({
      product_id: product.id,
      presentation_id: requestedPresentation.id,
      quantity: mixedQuantity.presentationQuantity,
    });
  }

  if (mixedQuantity.baseRemainder > 0.001) {
    const basePresentation = getProductPresentations(product).find(
      (presentation) => Math.abs(presentation.unit_quantity - 1) < 0.001,
    );
    items.push({
      product_id: product.id,
      presentation_id: basePresentation?.id,
      quantity: mixedQuantity.baseRemainder,
    });
  }

  return items.length > 0 ? items : null;
}

function extractMixedPresentationParts(
  message: string,
  product: Product,
  requestedPresentation: RequestedPresentation | null,
  productPresentation: ProductPresentation | null,
) {
  if (!requestedPresentation || isWeightBasedProduct(product)) {
    return null;
  }

  const requestedUnitQuantity =
    productPresentation?.unit_quantity ?? requestedPresentation.unitQuantity ?? 1;
  if (!Number.isFinite(requestedUnitQuantity) || requestedUnitQuantity <= 1.001) {
    return null;
  }

  const presentationPattern =
    requestedPresentation.kind === "named" && requestedPresentation.name
      ? buildPresentationNamePattern(requestedPresentation.name)
      : requestedPresentation.kind === "pack"
        ? "six[-\\s]?packs?"
        : "";
  if (!presentationPattern) {
    return null;
  }

  let presentationQuantity = 0;
  let matchedPresentation = false;

  for (const match of message.matchAll(
    new RegExp(`\\b(\\d+(?:[\\.,]\\d+)?)\\s+${presentationPattern}`, "g"),
  )) {
    const value = parseQuantityNumber(match[1]);
    if (value !== null) {
      presentationQuantity += value;
      matchedPresentation = true;
    }
  }

  for (const match of message.matchAll(
    new RegExp(`\\b(${COUNT_WORD_QUANTITY_PATTERN})\\s+${presentationPattern}`, "g"),
  )) {
    const value = parseWordQuantity(match[1]);
    if (value !== null) {
      presentationQuantity += value;
      matchedPresentation = true;
    }
  }

  if (
    new RegExp(`\\b(?:medio|media|mitad)\\s+${presentationPattern}`).test(message)
  ) {
    presentationQuantity += 0.5;
    matchedPresentation = true;
  }

  const hasHalfRemainder = new RegExp(
    `${presentationPattern}\\s+(?:y\\s+|con\\s+|mas\\s+)?(?:medio|media|mitad)\\b`,
  ).test(message);
  if (hasHalfRemainder) {
    if (!matchedPresentation) {
      presentationQuantity += 1;
    }
    presentationQuantity += 0.5;
    matchedPresentation = true;
  }

  if (!matchedPresentation) {
    return null;
  }

  let baseRemainder = 0;
  for (const match of message.matchAll(
    /\b(\d+(?:[\.,]\d+)?)\s*(?:unidad(?:es)?|unds?|uds?|litro(?:s)?|lts?|botella(?:s)?|funda(?:s)?|lata(?:s)?)\b/g,
  )) {
    const value = parseQuantityNumber(match[1]);
    if (value !== null) {
      baseRemainder += value;
    }
  }

  if (
    !Number.isFinite(presentationQuantity) ||
    !Number.isFinite(baseRemainder) ||
    presentationQuantity + baseRemainder <= 0
  ) {
    return null;
  }

  return {
    presentationQuantity: Number(presentationQuantity.toFixed(6)),
    baseRemainder: Number(baseRemainder.toFixed(6)),
  };
}

function extractMixedWeightQuantity(message: string, product: Product) {
  if (!isWeightBasedProduct(product)) {
    return null;
  }

  const hasWeightUnit =
    /\b(?:qq|quintal(?:es)?|lbs?|libras?|kg|kilos?)\b/.test(message);
  if (!hasWeightUnit) {
    return null;
  }

  let totalPounds = 0;
  let matched = false;
  let hasQuintalQuantity = false;
  let hasPoundQuantity = false;

  const quintalMatches = [
    ...message.matchAll(
      /\b(\d+(?:[\.,]\d+)?)\s*(?:qq|quintal(?:es)?)\b/g,
    ),
  ];

  for (const match of quintalMatches) {
    const value = parseQuantityNumber(match[1]);
    if (value !== null) {
      totalPounds += value * QUINTAL_TO_POUNDS;
      matched = true;
      hasQuintalQuantity = true;
    }
  }

  for (const match of message.matchAll(
    new RegExp(`\\b(${WORD_QUANTITY_PATTERN})\\s+(?:qq|quintal(?:es)?)\\b`, "g"),
  )) {
    const value = parseWordQuantity(match[1]);
    if (value !== null) {
      totalPounds += value * QUINTAL_TO_POUNDS;
      matched = true;
      hasQuintalQuantity = true;
    }
  }

  for (const match of message.matchAll(
    /\b(\d+(?:[\.,]\d+)?)\s+(?:medio|media|mitad)\s+(?:qq|quintal(?:es)?)\b/g,
  )) {
    const value = parseQuantityNumber(match[1]);
    if (value !== null) {
      totalPounds += value * (QUINTAL_TO_POUNDS / 2);
      matched = true;
      hasQuintalQuantity = true;
    }
  }

  if (
    !hasQuintalQuantity &&
    /\b(?:qq|quintal(?:es)?)\b/.test(message)
  ) {
    totalPounds += QUINTAL_TO_POUNDS;
    matched = true;
    hasQuintalQuantity = true;
  }

  if (
    hasQuintalQuantity &&
    /\b(?:qq|quintal(?:es)?)\s+(?:y\s+|con\s+)?(?:medio|media|mitad)\b/.test(message)
  ) {
    totalPounds += QUINTAL_TO_POUNDS / 2;
    matched = true;
  }

  if (
    totalPounds === 0 &&
    /\b(?:medio|media|mitad)\s+(?:qq|quintal)\b/.test(message)
  ) {
    totalPounds += QUINTAL_TO_POUNDS / 2;
    matched = true;
  }

  for (const match of message.matchAll(
    /\b(\d+(?:[\.,]\d+)?)\s*(?:lbs?|libras?)\b/g,
  )) {
    const value = parseQuantityNumber(match[1]);
    if (value !== null) {
      totalPounds += value;
      matched = true;
      hasPoundQuantity = true;
    }
  }

  for (const match of message.matchAll(
    new RegExp(`\\b(${WORD_QUANTITY_PATTERN})\\s+(?:lbs?|libras?)\\b`, "g"),
  )) {
    const value = parseWordQuantity(match[1]);
    if (value !== null) {
      totalPounds += value;
      matched = true;
      hasPoundQuantity = true;
    }
  }

  if (
    hasPoundQuantity &&
    /\b(?:lbs?|libras?)\s+(?:y\s+|con\s+)?(?:medio|media|medias|mitad)\b(?!\s*(?:qq|quintal(?:es)?|lbs?|libras?|kg|kilos?))/.test(message)
  ) {
    totalPounds += 0.5;
    matched = true;
  }

  for (const match of message.matchAll(
    /\b(\d+(?:[\.,]\d+)?)\s*(?:kg|kilos?)\b/g,
  )) {
    const value = parseQuantityNumber(match[1]);
    if (value !== null) {
      totalPounds += value * KILOGRAM_TO_POUNDS;
      matched = true;
    }
  }

  for (const match of message.matchAll(
    new RegExp(`\\b(${WORD_QUANTITY_PATTERN})\\s+(?:kg|kilos?)\\b`, "g"),
  )) {
    const value = parseWordQuantity(match[1]);
    if (value !== null) {
      totalPounds += value * KILOGRAM_TO_POUNDS;
      matched = true;
    }
  }

  const trailingPounds = message.match(
    /\b(?:qq|quintal(?:es)?)\s+(?:y\s+|con\s+)?(\d+(?:[\.,]\d+)?)\b(?!\s*(?:qq|quintal(?:es)?|lbs?|libras?|kg|kilos?))/,
  );
  const trailingPoundValue = parseQuantityNumber(trailingPounds?.[1]);
  if (trailingPoundValue !== null) {
    totalPounds += trailingPoundValue;
    matched = true;
  }

  return matched && totalPounds > 0
    ? Number(totalPounds.toFixed(3))
    : null;
}

function hasExplicitWeightUnit(message: string) {
  return /\b(?:qq|quintal(?:es)?|lbs?|libras?|kg|kilos?)\b/.test(message);
}

function hasExplicitPresentationQuantity(
  message: string,
  presentationPattern: string,
) {
  return (
    new RegExp(
      `\\b(?:\\d+(?:[\\.,]\\d+)?|${WORD_QUANTITY_PATTERN})\\s+${presentationPattern}`,
    ).test(message) ||
    new RegExp(
      `${presentationPattern}\\s+(?:y\\s+|con\\s+|mas\\s+)?(?:medio|media|mitad)\\b`,
    ).test(message)
  );
}

function buildPresentationNamePattern(name: string) {
  return normalizeText(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const digitFlexiblePart = part.replace(/(\d+)([a-zA-Z]+)/g, "$1 $2");
      return digitFlexiblePart
        .split(/\s+/)
        .map((token) => escapeRegex(token).replace(/\\-/g, "[-\\s]?"))
        .join("\\s*");
    })
    .map((part) => `\\b${part}(?:s|es)?\\b`)
    .join("[-\\s]+");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseQuantityNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const number = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseWordQuantity(value: string | undefined) {
  const normalized = normalizeText(value ?? "");

  if (normalized === "medio" || normalized === "media" || normalized === "mitad") {
    return 0.5;
  }

  if (normalized === "un" || normalized === "una" || normalized === "uno") {
    return 1;
  }

  const quantities: Record<string, number> = {
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
  };

  return quantities[normalized] ?? null;
}

function extractWordQuantity(message: string) {
  const words = new Set(tokenize(message));

  if (words.has("media") || words.has("medio") || words.has("mitad")) {
    return 0.5;
  }

  if (words.has("una") || words.has("uno") || words.has("un")) {
    return 1;
  }

  if (words.has("dos")) {
    return 2;
  }

  if (words.has("tres")) {
    return 3;
  }

  return null;
}

function formatOrderQuantity(product: Product, item: OrderItemInput, message = "") {
  const presentation = getProductPresentation(product, item.presentation_id);

  if (isWeightBasedProduct(product)) {
    const quantity = getOrderStockQuantity(
      product,
      item.quantity,
      item.presentation_id,
    );

    if (quantity === QUINTAL_TO_POUNDS / 2) {
      return `${formatProductQuantity(quantity)} lb (${presentation?.unit_quantity === quantity ? presentation.name : "medio quintal"})`;
    }

    if (quantity >= QUINTAL_TO_POUNDS) {
      const quintals = quantity / QUINTAL_TO_POUNDS;
      return `${formatProductQuantity(quantity)} lb (${formatProductQuantity(
        quintals,
      )} quintal${quintals === 1 ? "" : "es"})`;
    }

    return `${formatProductQuantity(quantity)} lb`;
  }

  if (presentation && presentation.unit_quantity > 1) {
    return formatPresentationQuantityName(
      item.quantity,
      presentation.name,
      presentation.unit_quantity,
      getRequestedBaseRemainderUnit(message),
    );
  }

  if (presentation && !isGenericUnitPresentation(presentation.name)) {
    return formatPresentationQuantityName(item.quantity, presentation.name);
  }

  return `${formatProductQuantity(item.quantity)} unidad${
    item.quantity === 1 ? "" : "es"
  }`;
}

function isGenericUnitPresentation(presentationName: string) {
  return /^(?:unidad|unidades|libra|libras)$/i.test(presentationName.trim());
}

function formatPresentationQuantityName(
  quantity: number,
  presentationName: string,
  unitQuantity = 1,
  baseRemainderUnit: string | null = null,
) {
  if (Math.abs(quantity - 0.5) < 0.001) {
    return `${getHalfPresentationPrefix(presentationName)} ${presentationName}`;
  }

  const wholeQuantity = Math.floor(quantity);
  const fractionalQuantity = Number((quantity - wholeQuantity).toFixed(3));
  if (
    wholeQuantity > 0 &&
    fractionalQuantity > 0.001 &&
    unitQuantity > 1.001
  ) {
    const wholeLabel = `${formatProductQuantity(
      wholeQuantity,
    )} ${pluralizePresentationName(presentationName, wholeQuantity)}`;
    const remainderQuantity = Number((fractionalQuantity * unitQuantity).toFixed(3));

    if (baseRemainderUnit && remainderQuantity > 0.001) {
      return `${wholeLabel} + ${formatProductQuantity(
        remainderQuantity,
      )} ${pluralizeUnitLabel(baseRemainderUnit, remainderQuantity)}`;
    }

    if (Math.abs(fractionalQuantity - 0.5) < 0.001) {
      return `${wholeLabel} + ${getHalfPresentationPrefix(
        presentationName,
      )} ${presentationName}`;
    }

    return `${wholeLabel} + ${formatProductQuantity(
      remainderQuantity,
    )} ${pluralizeUnitLabel("unidad", remainderQuantity)}`;
  }

  return `${formatProductQuantity(quantity)} ${pluralizePresentationName(
    presentationName,
    quantity,
  )}`;
}

function pluralizePresentationName(presentationName: string, quantity: number) {
  if (Math.abs(quantity - 1) < 0.001) {
    return presentationName;
  }

  const words = presentationName.trim().split(/\s+/);
  const lastWord = words.pop();
  if (!lastWord) {
    return presentationName;
  }

  words.push(pluralizeUnitLabel(lastWord, quantity));
  return words.join(" ");
}

function getRequestedBaseRemainderUnit(message: string) {
  if (/\blitro(?:s)?\b|\blts?\b/.test(message)) {
    return "litro";
  }

  if (/\bbotella(?:s)?\b/.test(message)) {
    return "botella";
  }

  if (/\bfunda(?:s)?\b/.test(message)) {
    return "funda";
  }

  if (/\blata(?:s)?\b/.test(message)) {
    return "lata";
  }

  if (/\b(?:unidad(?:es)?|unds?|uds?)\b/.test(message)) {
    return "unidad";
  }

  return null;
}

function pluralizeUnitLabel(unit: string, quantity: number) {
  if (Math.abs(quantity - 1) < 0.001) {
    return unit;
  }

  if (unit === "unidad") {
    return "unidades";
  }

  if (unit.endsWith("z")) {
    return `${unit.slice(0, -1)}ces`;
  }

  if (/[aeiou]$/i.test(unit)) {
    return `${unit}s`;
  }

  if (/[lnrd]$/i.test(unit)) {
    return `${unit}es`;
  }

  return `${unit}s`;
}

function getHalfPresentationPrefix(presentationName: string) {
  const firstWord = tokenize(presentationName)[0] ?? "";
  const feminineWords = new Set([
    "botella",
    "caja",
    "docena",
    "funda",
    "lata",
    "paca",
    "unidad",
  ]);

  return feminineWords.has(firstWord) ? "Media" : "Medio";
}

function formatStockForReply(product: Product, requiredStock?: number, requiredLabel?: string) {
  const currentStock = Number(product.stock);
  if (currentStock <= 0) {
    return "no aparece stock disponible ahora mismo";
  }

  let presentationInfo = "";
  if (product.presentations && product.presentations.length > 0) {
    const availablePresentations = product.presentations
      .filter((p) => p.use_for_sale !== false && p.is_active !== false && p.name && Number(p.unit_quantity) <= currentStock && p.name.toLowerCase() !== requiredLabel?.toLowerCase())
      .map((p) => p.name);
      
    if (availablePresentations.length > 0) {
      presentationInfo = ` (También puedes llevar en: ${availablePresentations.join(", ")})`;
    }
  }

  if (requiredStock && requiredStock > 0 && currentStock < requiredStock) {
    const labelToMention = requiredLabel ? requiredLabel.toLowerCase() : "la presentacion";
    return `no tenemos ${labelToMention} completo, pero hay disponibilidad para una cantidad menor${presentationInfo}`;
  }

  return `si hay disponibilidad${presentationInfo}`;
}

function extractSearchTokens(message: string, products: Product[] = []) {
  const requestedPresentation = getRequestedPresentation(message, products);
  const presentationTokens = getPresentationSearchTokens(products);
  return tokenize(message).filter(
    (token) =>
      token.length > 1 &&
      !/^\d+(?:[\.,]\d+)?$/.test(token) &&
      !STOP_WORDS.has(token) &&
      token !== String(requestedPresentation?.unitQuantity ?? "") &&
      !presentationTokens.has(token) &&
      ![
        "catalogo",
        "comprar",
        "cuales",
        "cuesta",
        "cuestan",
        "disponible",
        "disponibles",
        "favor",
        "lista",
        "listado",
        "media",
        "medio",
        "mitad",
        "mostrar",
        "muestrame",
        "pedido",
        "porfavor",
        "precio",
        "precios",
        "producto",
        "productos",
        "stock",
      ].includes(token),
  );
}

function getPresentationSearchTokens(products: Product[]) {
  const tokens = new Set<string>();

  for (const product of products) {
    for (const presentation of product.presentations ?? []) {
      if (
        presentation.is_active === false ||
        presentation.use_for_sale === false ||
        !presentation.name
      ) {
        continue;
      }

      for (const token of tokenize(presentation.name)) {
        if (token.length <= 1 || /^\d+(?:[\.,]\d+)?$/.test(token)) {
          continue;
        }

        for (const variant of getSearchTokenVariants(token)) {
          tokens.add(variant);
        }
      }
    }
  }

  return tokens;
}

function isShortFollowUp(message: string) {
  const tokens = tokenize(message).filter((token) => !STOP_WORDS.has(token));
  return tokens.length > 0 && tokens.length <= 3;
}

function pickReply(seed: string, replies: string[]) {
  if (replies.length === 0) {
    return "";
  }

  const hash = [...seed].reduce(
    (current, character) => current + character.charCodeAt(0),
    0,
  );

  return replies[hash % replies.length];
}

function tokenSimilarity(first: string, second: string) {
  const longest = Math.max(first.length, second.length);

  if (longest === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(first, second) / longest;
}

function levenshteinDistance(first: string, second: string) {
  const previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index,
  );
  const current = Array.from({ length: second.length + 1 }, () => 0);

  for (let row = 1; row <= first.length; row += 1) {
    current[0] = row;

    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost,
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

function hasAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(term));
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTextKeepingListSeparators(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s,;.-]/g, " ")
    .replace(/[.\n\r]+/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}
