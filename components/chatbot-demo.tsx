"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Loader2, Send, ShoppingCart } from "lucide-react";
import { formatProductStock } from "@/lib/pricing";
import type { ChatbotResponse } from "@/lib/types";

type Message = {
  role: "user" | "bot";
  text: string;
};

const quickPrompts = [
  "Quiero 2 arroz y 1 aceite",
  "Tienen leche?",
  "Necesito hacer un reclamo",
];

export default function ChatbotDemo() {
  const [input, setInput] = useState("Quiero 2 arroz y 1 aceite");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hola, soy el asistente del minimarket. Puedo revisar productos, armar pedidos y recibir reclamos.",
    },
  ]);
  const [lastResponse, setLastResponse] = useState<ChatbotResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const total = useMemo(
    () => lastResponse?.suggested_order?.total ?? 0,
    [lastResponse],
  );

  async function sendMessage(message = input) {
    const trimmed = message.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setInput("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await response.json()) as ChatbotResponse;

      setLastResponse(data);
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text:
            "answer" in data
              ? data.answer
              : "No pude procesar esa solicitud en este momento.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-stone-200 bg-white/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="brand-mark size-10">
              <Bot size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-black">Chatbot de compras</h2>
              <p className="text-sm text-stone-600">
                Demo conectado a /api/chatbot
              </p>
            </div>
          </div>
          <span className="badge">
            <ShoppingCart size={15} aria-hidden="true" />${total.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid max-h-[420px] gap-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 ${
              message.role === "bot"
                ? "bg-white text-stone-700"
                : "chat-user ml-auto"
            }`}
            key={`${message.role}-${index}`}
          >
            {message.text}
          </div>
        ))}
      </div>

      {lastResponse?.products?.length ? (
        <div className="grid gap-2 border-y border-stone-200 bg-stone-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
            Productos encontrados
          </p>
          <div className="flex flex-wrap gap-2">
            {lastResponse.products.map((product) => (
              <span className="badge" key={product.id}>
                {product.name} - Stock {formatProductStock(product)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              className="btn btn-secondary min-h-9 px-3 text-sm"
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            className="input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe un pedido..."
            value={input}
          />
          <button className="btn btn-primary aspect-square px-0" type="submit">
            {loading ? (
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            ) : (
              <Send size={18} aria-hidden="true" />
            )}
            <span className="sr-only">Enviar</span>
          </button>
        </form>
      </div>
    </section>
  );
}
