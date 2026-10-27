import AdminDashboard from "@/components/admin-dashboard";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="relative">
      {/* Banner superior para acceder a la propuesta de SIFF */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white px-4 py-3 shadow-lg flex items-center justify-between text-xs sm:text-sm font-medium sticky top-0 z-50">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
            <span>
              <strong>¡Prototipo SIFF Listo!</strong> Control de inventario para refrigeración con 357 repuestos del Excel, modo táctil y escáner QR.
            </span>
          </div>
          <Link
            href="/siff"
            className="shrink-0 flex items-center gap-1.5 bg-white text-slate-900 hover:bg-cyan-100 font-bold px-3 py-1.5 rounded-lg text-xs shadow transition-all active:scale-95"
          >
            Ver Propuesta SIFF <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <AdminDashboard />
    </main>
  );
}
