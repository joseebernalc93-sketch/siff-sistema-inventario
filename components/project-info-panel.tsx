"use client";

import {
  Boxes,
  ClipboardList,
  Database,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Users,
} from "lucide-react";

const webModules = [
  {
    icon: Boxes,
    title: "Inventario centralizado",
    text: "El panel web organiza productos, categorias, proveedores, precios, stock y fechas de caducidad.",
  },
  {
    icon: ReceiptText,
    title: "Compras y comprobantes",
    text: "Registra entradas de mercaderia, historial de movimientos y comprobantes de venta del minimarket.",
  },
  {
    icon: Users,
    title: "Usuarios administrados",
    text: "Permite revisar usuarios registrados desde la app, sus datos de acceso y su estado comercial.",
  },
];

const androidModules = [
  {
    icon: Smartphone,
    title: "Catalogo movil",
    text: "La aplicacion Android consulta los productos disponibles con precios, imagenes y existencias actualizadas.",
  },
  {
    icon: ShoppingCart,
    title: "Pedidos conectados",
    text: "Los usuarios pueden crear pedidos desde el movil y el sistema conserva la informacion para gestion interna.",
  },
  {
    icon: MessageSquareText,
    title: "Atencion al cliente",
    text: "El canal movil queda preparado para solicitudes, mensajes y comunicacion directa con el negocio.",
  },
];

const flow = [
  {
    label: "01",
    title: "Panel web",
    text: "El administrador controla la operacion diaria del minimarket.",
  },
  {
    label: "02",
    title: "Base de datos Supabase",
    text: "La informacion se guarda en una sola fuente confiable.",
  },
  {
    label: "03",
    title: "Aplicacion Android",
    text: "El cliente ve el catalogo y envia pedidos desde su celular.",
  },
];

const guarantees = [
  "Un mismo catalogo para web y movil.",
  "Datos listos para despliegue en Vercel.",
  "Arquitectura preparada para crecer por modulos.",
];

export default function ProjectInfoPanel() {
  return (
    <div className="grid gap-5">
      <section className="surface section-card overflow-hidden p-5 md:p-7">
        <div className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="grid gap-5">
            <span className="badge w-fit">
              <ClipboardList size={15} aria-hidden="true" />
              Ecosistema Minimarket IA
            </span>
            <div className="grid gap-4">
              <h3 className="max-w-4xl text-3xl font-black leading-tight text-stone-950 md:text-5xl">
                Sistema web y aplicacion Android trabajando sobre el mismo
                inventario.
              </h3>
              <p className="max-w-3xl text-base leading-8 text-stone-700 md:text-lg">
                Este proyecto integra un panel administrativo para el negocio y
                una app movil para los usuarios. El sistema web mantiene el
                control operativo del minimarket, mientras Android convierte ese
                catalogo en una experiencia de compra rapida, ordenada y siempre
                conectada a los datos reales.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {flow.map((step) => (
              <div
                className="grid gap-3 border-l-4 border-[var(--accent)] bg-white/55 py-3 pl-4"
                key={step.label}
              >
                <span className="text-sm font-black text-[var(--accent)]">
                  {step.label}
                </span>
                <div className="grid gap-1">
                  <h4 className="text-xl font-black text-stone-950">
                    {step.title}
                  </h4>
                  <p className="text-sm leading-6 text-stone-600">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SystemColumn
          icon={LayoutDashboard}
          items={webModules}
          label="Sistema web"
          text="Herramienta principal para que el administrador mantenga el negocio bajo control desde el navegador."
          title="Gestion administrativa"
        />
        <SystemColumn
          icon={Smartphone}
          items={androidModules}
          label="Aplicacion Android"
          text="Canal de venta y consulta para que el cliente interactue con el minimarket desde su telefono."
          title="Experiencia del cliente"
        />
      </section>

      <section className="surface grid gap-4 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <span className="badge w-fit">
              <Database size={15} aria-hidden="true" />
              Conexion de datos
            </span>
            <h3 className="text-2xl font-black text-stone-950">
              Una sola informacion, dos puntos de acceso.
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-stone-600">
              La web administra y la app consume la informacion. Asi el
              minimarket evita registros duplicados, conserva el stock alineado
              y ofrece al cliente un catalogo coherente con la operacion real.
            </p>
          </div>
          <ShieldCheck className="brand-icon" size={30} aria-hidden="true" />
        </div>

        <div className="grid gap-3 border-t border-[var(--line)] pt-4 md:grid-cols-3">
          {guarantees.map((guarantee) => (
            <p
              className="text-sm font-bold leading-6 text-stone-700"
              key={guarantee}
            >
              {guarantee}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function SystemColumn({
  icon: HeaderIcon,
  items,
  label,
  text,
  title,
}: {
  icon: typeof LayoutDashboard;
  items: typeof webModules;
  label: string;
  text: string;
  title: string;
}) {
  return (
    <article className="surface section-card grid gap-5 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="brand-icon grid size-12 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
          <HeaderIcon size={24} aria-hidden="true" />
        </span>
        <div className="grid gap-1">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent)]">
            {label}
          </span>
          <h3 className="text-2xl font-black text-stone-950">{title}</h3>
          <p className="text-sm leading-6 text-stone-600">{text}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div className="flex gap-3 border-t border-[var(--line)] pt-4" key={item.title}>
              <Icon className="mt-1 brand-icon shrink-0" size={20} aria-hidden="true" />
              <div className="grid gap-1">
                <h4 className="font-black text-stone-950">{item.title}</h4>
                <p className="text-sm leading-6 text-stone-600">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
