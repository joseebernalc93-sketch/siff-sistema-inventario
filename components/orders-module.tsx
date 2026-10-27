import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2, Package, Check, X, ReceiptText, Bike, Trash2, Search } from "lucide-react";
import type { AdminOrderRecord } from "@/lib/types";

type DeliveryOption = {
  id: string;
  name: string;
  phone?: string | null;
};

function normalizeOrderSearch(value: string | number | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function OrdersModule({
  onOrderProcessed
}: {
  onOrderProcessed?: () => void
} = {}) {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrdersIds, setSelectedOrdersIds] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryOption[]>([]);
  const [fetchingDeliveries, setFetchingDeliveries] = useState(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
      if (!silent) setMessage({ type: "error", text: "Error al cargar pedidos" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The first request owns the initial loading state for this mounted view.
    const timeoutId = window.setTimeout(() => {
      fetchOrders();
    }, 0);
    const intervalId = setInterval(() => {
      fetchOrders(true);
    }, 10000);
    return () => {
      window.clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (id: string, status: string, approve_payment?: boolean) => {
    try {
      setMessage(null);
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approve_payment }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar estado");
      }
      
      setMessage({ type: "success", text: "Estado actualizado correctamente" });
      fetchOrders();
      if (onOrderProcessed) {
        onOrderProcessed();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  const updateOrderStatusWithDelivery = async (id: string, deliveryUserId: string) => {
    try {
      setMessage(null);
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed", delivery_user_id: deliveryUserId }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al asignar delivery");
      }
      
      setMessage({ type: "success", text: "Pedido despachado correctamente" });
      fetchOrders();
      if (onOrderProcessed) {
        onOrderProcessed();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  const handleDespachar = async () => {
    setIsDeliveryModalOpen(true);
    setFetchingDeliveries(true);
    try {
      const res = await fetch("/api/admin/delivery-users");
      const data = await res.json();
      setDeliveries(data.deliveries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingDeliveries(false);
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrdersIds.length === 0) return;
    if (!confirm(`¿Estás seguro de eliminar ${selectedOrdersIds.length} pedido(s)? Esta acción borrará el registro del historial sin alterar el inventario.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/orders/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedOrdersIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar pedidos");
      
      setMessage({ type: "success", text: "Pedidos eliminados correctamente" });
      setSelectedOrdersIds([]);
      if (selectedOrderId && selectedOrdersIds.includes(selectedOrderId)) {
        setSelectedOrderId(null);
      }
      fetchOrders();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este pedido? Esta acción borrará el registro del historial sin alterar el inventario.")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar pedido");
      
      setMessage({ type: "success", text: "Pedido eliminado correctamente" });
      setSelectedOrdersIds(prev => prev.filter(oid => oid !== id));
      if (selectedOrderId === id) {
        setSelectedOrderId(null);
      }
      fetchOrders();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResolveAlert = async (id: string, notes: string, status: string, type: 'client' | 'delivery') => {
    try {
      let newNotes = notes;
      if (type === 'client') {
        newNotes = notes.replace("Cliente confirmo que recibio el pedido: No", "Cliente confirmo que recibio el pedido: Si (Resuelto)");
      } else {
        newNotes = notes.replace("Alerta: Repartidor reportó que no pudo entregar el pedido.", "Alerta: Repartidor reportó que no pudo entregar el pedido. (Resuelto)");
      }
      
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: newNotes }),
      });
      if (!response.ok) {
        throw new Error("Error al resolver la alerta");
      }
      fetchOrders();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  const getStatusLabel = (status: string, notes?: string | null) => {
    const isRetiro = notes?.toUpperCase().includes("RETIRO EN LOCAL");
    const labels: Record<string, string> = {
      pending: "PENDIENTE",
      confirmed: isRetiro ? "LISTO PARA RETIRO" : "EN CAMINO",
      preparing: "PREPARANDO",
      delivered: "ENTREGADO",
      cancelled: "CANCELADO",
    };
    return labels[status] ?? status.toUpperCase();
  };

  const filteredOrders = useMemo(() => {
    const term = normalizeOrderSearch(orderSearch);
    if (!term) return orders;

    return orders.filter((order) => {
      const statusLabel = getStatusLabel(order.status, order.notes);
      const statusSearchAliases =
        order.status === "cancelled"
          ? "cancelado cancelada cancelados canceladas anulado anulada anulados anuladas"
          : "";
      const searchable = [
        order.order_code,
        order.customer_name,
        order.customer_identity,
        order.status,
        statusLabel,
        statusSearchAliases,
      ]
        .map(normalizeOrderSearch)
        .join(" ");

      return searchable.includes(term);
    });
  }, [orderSearch, orders]);

  const activeSelectedOrderId = useMemo(() => {
    if (loading || filteredOrders.length === 0) return null;

    const pendingOrder = filteredOrders.find((order) => order.status === "pending");
    const selectedOrder = selectedOrderId
      ? filteredOrders.find((order) => order.id === selectedOrderId)
      : null;

    if (selectedOrder) {
      const selectedOrderIsClosed =
        selectedOrder.status === "delivered" || selectedOrder.status === "cancelled";
      if (!selectedOrderIsClosed || !pendingOrder) {
        return selectedOrder.id;
      }
    }

    return (pendingOrder ?? filteredOrders[0]).id;
  }, [filteredOrders, loading, selectedOrderId]);

  const selectedOrder = orders.find(o => o.id === activeSelectedOrderId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {message && (
        <div className={`p-4 mb-5 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center p-12 bg-stone-50 rounded-lg border border-stone-200">
          <Package className="h-12 w-12 mx-auto text-stone-400 mb-4" />
          <h3 className="text-lg font-medium">No hay pedidos</h3>
          <p className="text-stone-500">Los pedidos nuevos aparecerán aquí.</p>
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(320px,460px)_1fr] items-start">
          <section className="surface catalog-card overflow-hidden flex flex-col sticky top-6 max-h-[calc(100vh-48px)]">
            <div className="grid gap-4 border-b border-stone-200 bg-white/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">Registro de Pedidos</h3>
                  <p className="text-sm text-stone-600">
                    {filteredOrders.length} de {orders.length} pedido{orders.length === 1 ? "" : "s"} visibles.
                  </p>
                </div>
                {selectedOrdersIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteOrders}
                    disabled={isDeleting}
                    className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1.5 text-sm"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    Eliminar seleccionados ({selectedOrdersIds.length})
                  </button>
                )}
              </div>
              <label className="field">
                <span className="label">Buscar pedido</span>
                <span className="admin-search-input">
                  <Search size={17} aria-hidden="true" />
                  <input
                    className="input w-full"
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Código ORD, cliente o cédula..."
                    value={orderSearch}
                  />
                </span>
              </label>
            </div>
            
            <div className="flex-1 overflow-y-auto grid divide-y divide-stone-200">
              {filteredOrders.map((order) => {
                const selected = activeSelectedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    className={`provider-row flex items-stretch border-b border-stone-200 p-0 ${
                      selected ? "provider-row-active" : ""
                    }`}
                  >
                    <div className="flex items-center pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrdersIds.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrdersIds(prev => [...prev, order.id]);
                          } else {
                            setSelectedOrdersIds(prev => prev.filter(id => id !== order.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-stone-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                    </div>
                    <button
                      aria-pressed={selected}
                      className="flex-1 grid grid-cols-[1fr_auto] items-center gap-4 p-5 pl-3 text-left"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-stone-950 font-black">{order.order_code}</strong>
                          {order.notes?.includes("RETIRO EN LOCAL") && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-200">
                              {order.notes.match(/TICKET:\s*([^\n]+)/) ? `TICKET: ${order.notes.match(/TICKET:\s*([^\n]+)/)![1].trim()}` : "Retiro en local"}
                            </span>
                          )}
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-stone-100 text-stone-800'
                        }`}>
                          {getStatusLabel(order.status, order.notes)}
                        </span>
                        {(() => {
                          if (order.notes?.includes("Alerta: Repartidor reportó que no pudo entregar el pedido.") && !order.notes?.includes("(Resuelto)")) {
                            return (
                              <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-red-100 text-red-800 ml-2">
                                ❌ No entregado
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span className="text-sm font-medium text-stone-700">{order.customer_name || "Consumidor final"}</span>
                      <span className="text-xs text-stone-500">{order.items.length} productos - {new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div className="grid items-end gap-1 text-right">
                      <span className="font-black text-xl text-stone-950">${order.total.toFixed(2)}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="p-10 text-center text-sm leading-6 text-stone-600">
                  No hay pedidos que coincidan con el código, cliente o cédula buscada.
                </div>
              )}
            </div>
          </section>

          <section className="surface catalog-card overflow-hidden">
            {selectedOrder ? (
              <div className="bg-white rounded-lg overflow-hidden">
                <article className="sales-invoice-preview m-0 border-0 shadow-none rounded-none">
                  <header className="sales-invoice-header">
                    <div className="sales-invoice-brand">
                      <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain bg-white rounded-md p-1" />
                      <span className="flex flex-col gap-1">
                        <strong>MINIMARKET VALLOLET</strong>
                        <small>Pedido Activo</small>
                        {(() => {
                           const match = selectedOrder.notes?.match(/Necesita cambio\/vuelto: (.+)/i);
                           if (match) {
                             return <span className="bg-yellow-400 !text-black font-extrabold text-[13px] px-2 py-1 rounded inline-block w-fit mt-1">⚠️ Vuelto: {match[1].replace(/\(Para ([\d.]+)\)/g, "(Para $$$1)")}</span>;
                           }
                           return null;
                        })()}
                        {(() => {
                           const match = selectedOrder.notes?.match(/Cliente confirmo que recibio el pedido: (Si|No)/i);
                           if (match) {
                             const isYes = match[1].toLowerCase() === 'si';
                             const isResolved = selectedOrder.notes?.includes('Si (Resuelto)') || false;
                             return (
                               <div className="flex items-center gap-2 mt-1 flex-wrap">
                                 <span className={`font-extrabold text-[13px] px-2 py-1 rounded inline-block w-fit ${isYes ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                   {isYes ? '✓ Cliente confirmo que recibio el pedido' : '❌ Cliente indico no haber recibido el pedido'}
                                 </span>
                                 {!isYes && !isResolved && (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (confirm('¿Marcar este problema como resuelto?')) {
                                         handleResolveAlert(selectedOrder.id, selectedOrder.notes || '', selectedOrder.status, 'client');
                                       }
                                     }}
                                     className="bg-stone-800 hover:bg-stone-700 text-white text-xs px-2 py-1 rounded font-bold transition-colors"
                                   >
                                     ✔ Resolver Alerta
                                   </button>
                                 )}
                               </div>
                             );
                           }
                           return null;
                        })()}
                        {(() => {
                           if (selectedOrder.notes?.includes("Alerta: Repartidor reportó que no pudo entregar el pedido.")) {
                             const isResolved = selectedOrder.notes?.includes("(Resuelto)") || false;
                             return (
                               <div className="flex items-center gap-2 mt-1 flex-wrap">
                                 <span className={`font-extrabold text-[13px] px-2 py-1 rounded inline-block w-fit ${isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                   {isResolved ? '✓ Problema de repartidor resuelto' : '❌ Repartidor no pudo entregar'}
                                 </span>
                                 {!isResolved && (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (confirm('¿Marcar este problema como resuelto?')) {
                                         handleResolveAlert(selectedOrder.id, selectedOrder.notes || '', selectedOrder.status, 'delivery');
                                       }
                                     }}
                                     className="bg-stone-800 hover:bg-stone-700 text-white text-xs px-2 py-1 rounded font-bold transition-colors"
                                   >
                                     ✔ Resolver Alerta
                                   </button>
                                 )}
                               </div>
                             );
                           }
                           return null;
                        })()}
                      </span>
                    </div>
                    <div className="sales-invoice-number">
                      <span className="bg-white/20 px-2 py-0.5 rounded-full">{getStatusLabel(selectedOrder.status, selectedOrder.notes)}</span>
                      <strong>{selectedOrder.order_code}</strong>
                      {selectedOrder.notes?.includes("RETIRO EN LOCAL") && (
                        <span className="bg-white/20 text-white px-2 py-0.5 mt-1 rounded-full text-xs font-bold border border-white/40">
                          {selectedOrder.notes.match(/TICKET:\s*([^\n]+)/) ? `TICKET: ${selectedOrder.notes.match(/TICKET:\s*([^\n]+)/)![1].trim()}` : "Retiro en Local"}
                        </span>
                      )}
                      <small>{new Date(selectedOrder.created_at).toLocaleString()}</small>
                    </div>
                  </header>

                  <div className="sales-invoice-info-grid">
                    <section>
                      <span>Cliente</span>
                      <strong>{selectedOrder.customer_name || "Consumidor final"}</strong>
                      <small>Cédula/RUC: {selectedOrder.customer_identity ?? "No registrada"}</small>
                      <small>Teléfono: {selectedOrder.customer_phone ?? "No registrado"}</small>
                    </section>
                    <section>
                      <span>Entrega y pago ({selectedOrder.channel.toUpperCase()})</span>
                      {(() => {
                        const isRetiro = selectedOrder.notes?.toUpperCase().includes("RETIRO EN LOCAL");
                        const ticketMatch = selectedOrder.notes?.match(/TICKET:\s*([^\n]+)/);
                        if (isRetiro) {
                          return <strong>{ticketMatch ? `Entrega ${ticketMatch[1].trim()}` : "Retiro en local"}</strong>;
                        }
                        return <strong>Entrega a domicilio</strong>;
                      })()}
                      {(() => {
                        const bankMatch = selectedOrder.notes?.match(/Banco:\s*([^\n]+)/);
                        if (bankMatch) {
                          return (
                            <div className="mt-2 mb-1">
                              <span className="bg-blue-100 text-blue-800 font-extrabold text-[12px] px-2 py-1 rounded border border-blue-200 shadow-sm inline-flex items-center gap-1">
                                🏦 Banco: {bankMatch[1].trim()}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <small className="whitespace-pre-wrap mt-1 block">
                        {(selectedOrder.notes || "Dirección por confirmar")
                          .replace(/Necesita cambio\/vuelto: .+(\r?\n)?/i, "")
                          .replace(/Banco: .*\n?/g, "")
                          .replace(/Titular: .*\n?/g, "")
                          .replace(/Tipo: .*\n?/g, "")
                          .replace(/Cuenta: .*\n?/g, "")
                          .replace(/Cedula\/RUC: .*\n?/g, "")
                          .replace(/CLIENTE_CEDULA: .*\n?/g, "")
                          .replace(/METODO_PAGO: .*\n?/g, "")
                          .replace(/COMPROBANTE: .*\n?/g, "")
                          .replace(/RETIRO EN LOCAL - TICKET: .*\n?/g, "")
                          .replace(/Cuenta bancaria seleccionada.*\n?/gi, "")
                          .replace(/Fecha enviado a delivery: .*\n?/gi, "")
                          .replace(/Fecha entregado: .*\n?/gi, "")
                          .replace(/Confirmacion de entrega: .*\n?/gi, "")
                          .replace(/\[PAGO_APROBADO\].*\n?/gi, "")
                          .replace(/Correo: .*\n?/gi, "")
                          .trim()}
                      </small>
                    </section>
                  </div>

                  <div className="sales-invoice-table-wrap">
                    <table className="sales-invoice-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-center">Cantidad</th>
                          <th className="text-right">P. Unitario sin IVA</th>
                          <th className="text-right">IVA</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item) => {
                          const ivaRate = item.has_iva ? (item.iva_rate || 15) : 0;
                          const displayTotal = item.line_total;
                          const ivaAmount = ivaRate > 0 ? Number((displayTotal * ivaRate / 100).toFixed(2)) : 0;
                          const totalItem = displayTotal + ivaAmount;

                          return (
                            <tr key={item.id}>
                              <td>{item.product_name}</td>
                              <td className="text-center">{item.quantity}</td>
                              <td className="text-right">${displayTotal.toFixed(2)}</td>
                              <td className="text-right">${ivaAmount.toFixed(2)}</td>
                              <td className="text-right font-medium">${totalItem.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="sales-invoice-summary-row">
                          <td colSpan={2} className="sales-invoice-summary-empty" />
                          <td className="text-right font-bold text-black pb-2 pt-4">Subtotal</td>
                          <td className="text-right font-bold text-black pb-2 pt-4">IVA (15%)</td>
                          <td className="text-right font-bold text-black pb-2 pt-4">Total</td>
                        </tr>
                        <tr className="sales-invoice-summary-row">
                          <td colSpan={2} className="sales-invoice-summary-empty" />
                          <td className="text-right font-bold text-black pb-4">${selectedOrder.subtotal.toFixed(2)}</td>
                          <td className="text-right font-bold text-black pb-4">${(selectedOrder.total - selectedOrder.subtotal).toFixed(2)}</td>
                          <td className="text-right font-bold text-black pb-4">${selectedOrder.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </article>
                {(() => {
                  const isTransfer = selectedOrder.payment_method === "transferencia" || selectedOrder.notes?.includes("METODO_PAGO: TRANSFERENCIA");
                  if (!isTransfer) return null;
                  
                  const lines = selectedOrder.notes?.split("\n") || [];
                  const receiptLine = lines.find(l => l.startsWith("COMPROBANTE: "));
                  const parsedReceiptUrl = receiptLine ? receiptLine.replace("COMPROBANTE: ", "").trim() : "";
                  const receiptUrl = selectedOrder.transfer_receipt_url || parsedReceiptUrl;
                  
                  return (
                    <div className="w-full p-6 bg-white shrink-0 border-t border-stone-200">
                      <p className="font-bold text-stone-800 mb-4 text-center">Comprobante Adjunto</p>
                      {receiptUrl ? (
                        <div className="w-full rounded-xl border-2 border-stone-100 overflow-hidden bg-stone-50 flex items-center justify-center p-2">
                          <img src={receiptUrl} alt="Comprobante" className="max-w-full object-contain max-h-[600px]" />
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400">
                          Sin comprobante legible
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap gap-2 justify-end">
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <>
                      {(() => {
                        const isTransfer = selectedOrder.payment_method === "transferencia" || selectedOrder.notes?.includes("METODO_PAGO: TRANSFERENCIA");
                        const isPaymentApproved = selectedOrder.notes?.includes("[PAGO_APROBADO]");
                        if (selectedOrder.status === "pending" && isTransfer && !isPaymentApproved) {
                          return (
                            <>
                              <button
                                onClick={() => {
                                  if (confirm("¿Rechazar transferencia y cancelar pedido? Se devolverá el stock automáticamente.")) {
                                    updateOrderStatus(selectedOrder.id, "cancelled");
                                  }
                                }}
                                className="px-5 py-2 text-red-600 font-bold hover:bg-red-50 border border-red-200 rounded text-sm transition-colors"
                              >
                                Rechazar Transferencia
                              </button>
                              <button
                                onClick={() => updateOrderStatus(selectedOrder.id, "pending", true)}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors"
                              >
                                <Check className="h-4 w-4" /> Aprobar Pago
                              </button>
                            </>
                          );
                        }
                        
                        const isRetiroLocal = selectedOrder.notes?.includes("RETIRO EN LOCAL") || false;
                        return (
                          <>
                            <button
                              onClick={() => {
                                if (confirm('¿Seguro que deseas cancelar este pedido? Se devolverá el stock automáticamente.')) {
                                  updateOrderStatus(selectedOrder.id, "cancelled");
                                }
                              }}
                              className="inline-flex items-center gap-1 bg-white text-stone-700 border border-stone-300 px-4 py-2 rounded text-sm font-medium hover:bg-stone-100"
                            >
                              <X className="h-4 w-4" /> Cancelar pedido
                            </button>
                            
                            {selectedOrder.status === "pending" && (() => {
                              const shouldPrepareBeforeDispatch =
                                isRetiroLocal || (isTransfer && isPaymentApproved);
                              const pendingActionLabel =
                                isTransfer && isPaymentApproved
                                  ? "Preparar"
                                  : isRetiroLocal
                                    ? "Aceptar Pedido"
                                    : "Aprobar y Despachar";

                              return (
                                <button
                                  onClick={
                                    shouldPrepareBeforeDispatch
                                      ? () => updateOrderStatus(selectedOrder.id, "preparing")
                                      : handleDespachar
                                  }
                                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors"
                                >
                                  <Check className="h-4 w-4" /> {pendingActionLabel}
                                </button>
                              );
                            })()}
                            
                            {selectedOrder.status === "preparing" && (
                              <button
                                onClick={isRetiroLocal ? () => updateOrderStatus(selectedOrder.id, "confirmed") : handleDespachar}
                                className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-2 rounded text-sm font-bold hover:bg-amber-600 shadow-sm transition-colors"
                              >
                                <Bike className="h-4 w-4" /> {isRetiroLocal ? "Listo para retiro" : "Despachar"}
                              </button>
                            )}
                            
                            {selectedOrder.status === "confirmed" && (
                              isRetiroLocal ? (
                                <button
                                  onClick={() => updateOrderStatus(selectedOrder.id, "delivered")}
                                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-green-700 shadow-sm transition-colors"
                                >
                                  <Check className="h-4 w-4" /> Entregado
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-2 bg-stone-100 text-stone-500 px-6 py-2 rounded text-sm font-bold border border-stone-200 cursor-not-allowed"
                                >
                                  <Bike className="h-4 w-4" /> En camino a entrega
                                </button>
                                )
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded text-sm font-bold hover:bg-red-100 transition-colors ml-auto"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-96 place-items-center p-10 text-center">
                <div className="grid max-w-md gap-3">
                  <ReceiptText className="mx-auto brand-icon" size={36} />
                  <h3 className="text-xl font-black">Selecciona un pedido</h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Haz clic en cualquier pedido de la lista izquierda para ver sus detalles completos, productos y opciones de estado.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      )}

      {/* Delivery Selection Modal */}
      {isDeliveryModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-stone-900">Asignar Repartidor</h3>
              <button 
                onClick={() => setIsDeliveryModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {fetchingDeliveries ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-stone-400" />
                </div>
              ) : deliveries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 gap-2">
                  <Bike className="h-10 w-10 opacity-20" />
                  <p>No hay repartidores disponibles o activos.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {deliveries.map(d => (
                    <button
                      key={d.id}
                      className="p-4 border border-stone-200 rounded-lg text-left hover:bg-stone-50 hover:border-accent transition-colors flex items-center gap-4 group"
                      onClick={() => {
                        updateOrderStatusWithDelivery(selectedOrder.id, d.id);
                        setIsDeliveryModalOpen(false);
                      }}
                    >
                      <div className="bg-stone-100 p-2 rounded-full group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                        <Bike className="h-5 w-5" />
                      </div>
                      <div>
                        <strong className="block text-stone-900 text-[15px]">{d.name}</strong>
                        <span className="text-sm text-stone-500">{d.phone || "Sin teléfono"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
