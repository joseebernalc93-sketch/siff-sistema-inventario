import SiffProposalDemo from "@/components/siff-proposal-demo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SIFF Refrigeración Industrial - Sistema de Inventario & Salidas",
  description: "Propuesta interactiva y prototipo de control de inventario con escáner QR y salida rápida para técnicos.",
};

export default function SiffPage() {
  return <SiffProposalDemo />;
}
