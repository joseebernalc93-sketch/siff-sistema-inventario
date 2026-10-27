import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimarket IA",
  description:
    "Prototipo web para inventario, ventas y chatbot inteligente conectado a Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}

