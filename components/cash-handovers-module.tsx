"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeSearch(value: string | number | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getEcuadorDateTimeParam(dateInput: string, boundary: "start" | "end") {
  return `${dateInput}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}-05:00`;
}

function isCompleteDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type CashHandover = {
  id: string;
  order_code: string;
  customer_name: string;
  total: number;
  cash_handover_status: string;
  cash_handed_over_at: string | null;
  cash_confirmed_at: string | null;
  created_at: string;
  delivery_user_id: string;
  delivery_user_name: string;
  delivery_user_identity: string;
};

type CashHandoverFilter = "all" | "day" | "month" | "range";

function getHandoverStatus(value: string | null | undefined) {
  if (value === "confirmed") return "confirmed";
  if (value === "handed_over") return "handed_over";
  return "pending";
}

function getHandoverStatusLabel(value: string | null | undefined) {
  const status = getHandoverStatus(value);
  if (status === "confirmed") return "CONFIRMADO";
  if (status === "handed_over") return "POR REVISAR";
  return "POR CONFIRMAR";
}

function getHandoverBadgeClass(value: string | null | undefined) {
  const status = getHandoverStatus(value);
  if (status === "confirmed") return "bg-green-100 text-green-800";
  if (status === "handed_over") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function getHandoverPanelClass(value: string | null | undefined) {
  const status = getHandoverStatus(value);
  if (status === "confirmed") return "border-green-200 bg-green-50";
  if (status === "handed_over") return "border-amber-200 bg-amber-50";
  return "border-red-200 bg-red-50";
}

export default function CashHandoversModule() {
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [filterType, setFilterType] = useState<CashHandoverFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedHandoverId, setSelectedHandoverId] = useState<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  const fetchHandovers = useCallback(async (isBackground = false) => {
    if (!isBackground && !initialLoadDoneRef.current) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", getEcuadorDateTimeParam(startDate, "start"));
      if (endDate) params.append("endDate", getEcuadorDateTimeParam(endDate, "end"));

      const res = await fetch(`/api/admin/cash-handovers?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setHandovers(data.handovers);
      } else {
        setMessage({ text: data.error || "Error al cargar", type: "error" });
      }
    } catch {
      setMessage({ text: "Error de red", type: "error" });
    } finally {
      initialLoadDoneRef.current = true;
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchHandovers();
    }, 0);
    const intervalId = setInterval(() => {
      fetchHandovers(true);
    }, 10000);
    return () => {
      window.clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [fetchHandovers]);

  const handleAction = async (orderIds: string[], action: "confirm" | "reject") => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cash-handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, action }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: "Actualizado correctamente", type: "success" });
        fetchHandovers();
      } else {
        setMessage({ text: data.error || "Error", type: "error" });
      }
    } catch {
      setMessage({ text: "Error de red", type: "error" });
    }
    setProcessing(false);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setStartDate("");
    setEndDate("");
    setStartDateInput("");
    setEndDateInput("");
  };

  function handleSingleDateInput(value: string) {
    setStartDateInput(value);
    setEndDateInput(value);

    if (!value || isCompleteDateInput(value)) {
      setStartDate(value);
      setEndDate(value);
    }
  }

  function handleStartDateInput(value: string) {
    setStartDateInput(value);

    if (!value || isCompleteDateInput(value)) {
      setStartDate(value);
    }
  }

  function handleEndDateInput(value: string) {
    setEndDateInput(value);

    if (!value || isCompleteDateInput(value)) {
      setEndDate(value);
    }
  }

  const filteredHandovers = useMemo(() => {
    const term = normalizeSearch(searchTerm);
    if (!term) return handovers;

    return handovers.filter((handover) => {
      const searchable = [
        handover.delivery_user_name,
        handover.delivery_user_identity,
        handover.order_code,
        handover.customer_name,
      ]
        .map(normalizeSearch)
        .join(" ");

      return searchable.includes(term);
    });
  }, [handovers, searchTerm]);

  const pendingHandovers = filteredHandovers.filter((h) => h.cash_handover_status === "handed_over");
  const confirmedHandovers = filteredHandovers.filter((h) => h.cash_handover_status === "confirmed");
  const unsubmittedHandovers = filteredHandovers.filter(
    (h) => h.cash_handover_status === "pending" || !h.cash_handover_status,
  );

  const totalPendingReview = pendingHandovers.reduce((sum, h) => sum + h.total, 0);
  const totalUnsubmitted = unsubmittedHandovers.reduce((sum, h) => sum + h.total, 0);
  const totalConfirmed = confirmedHandovers.reduce((sum, h) => sum + h.total, 0);
  const visibleHandovers = useMemo(() => {
    const priority: Record<string, number> = {
      handed_over: 0,
      pending: 1,
      confirmed: 2,
    };

    return [...filteredHandovers].sort((first, second) => {
      const firstStatus = getHandoverStatus(first.cash_handover_status);
      const secondStatus = getHandoverStatus(second.cash_handover_status);
      const statusDifference = priority[firstStatus] - priority[secondStatus];
      if (statusDifference !== 0) return statusDifference;

      return (
        new Date(second.cash_handed_over_at ?? second.cash_confirmed_at ?? second.created_at).getTime() -
        new Date(first.cash_handed_over_at ?? first.cash_confirmed_at ?? first.created_at).getTime()
      );
    });
  }, [filteredHandovers]);
  const selectedHandover =
    visibleHandovers.find((handover) => handover.id === selectedHandoverId) ??
    null;
  const hasActiveFilters =
    filterType !== "all" ||
    Boolean(searchTerm.trim()) ||
    Boolean(startDate) ||
    Boolean(endDate);

  useEffect(() => {
    if (
      selectedHandoverId &&
      !visibleHandovers.some((handover) => handover.id === selectedHandoverId)
    ) {
      setSelectedHandoverId(null);
    }
  }, [selectedHandoverId, visibleHandovers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {message && (
        <div className={`mb-5 rounded-md border p-4 font-bold ${
          message.type === "success"
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      <div className="surface mb-5 grid gap-3 p-5 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-amber-700">Por revisar</span>
            <Clock size={18} className="text-amber-600" aria-hidden="true" />
          </div>
          <strong className="mt-2 block text-2xl font-black text-stone-950">{formatMoney(totalPendingReview)}</strong>
          <p className="text-xs font-bold text-stone-500">{pendingHandovers.length} entrega(s) reportadas</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-green-700">Confirmado</span>
            <ShieldCheck size={18} className="text-green-600" aria-hidden="true" />
          </div>
          <strong className="mt-2 block text-2xl font-black text-stone-950">{formatMoney(totalConfirmed)}</strong>
          <p className="text-xs font-bold text-stone-500">{confirmedHandovers.length} registro(s)</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-red-700">Por confirmar</span>
            <CreditCard size={18} className="text-red-600" aria-hidden="true" />
          </div>
          <strong className="mt-2 block text-2xl font-black text-stone-950">{formatMoney(totalUnsubmitted)}</strong>
          <p className="text-xs font-bold text-stone-500">{unsubmittedHandovers.length} pedido(s) sin entregar</p>
        </div>
      </div>

      {handovers.length === 0 && !hasActiveFilters ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-12 text-center">
          <CreditCard className="mx-auto mb-4 h-12 w-12 text-stone-400" />
          <h3 className="text-lg font-medium">No hay recaudaciones</h3>
          <p className="text-stone-500">Las entregas de efectivo aparecerán aquí.</p>
        </div>
      ) : (
        <section className="grid items-start gap-5 xl:grid-cols-[minmax(320px,460px)_1fr]">
          <section className="surface catalog-card sticky top-6 flex max-h-[calc(100vh-48px)] flex-col overflow-hidden">
            <div className="grid gap-4 border-b border-stone-200 bg-white/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="badge badge-yellow mb-2 w-fit">
                    <DollarSign size={15} aria-hidden="true" />
                    Control de efectivo
                  </span>
                  <h3 className="text-xl font-black">Recaudación Delivery</h3>
                  <p className="text-sm text-stone-600">
                    {visibleHandovers.length} de {handovers.length} registro{handovers.length === 1 ? "" : "s"} visibles.
                  </p>
                </div>
                <button
                  onClick={() => fetchHandovers()}
                  disabled={loading || processing}
                  className="btn btn-secondary h-11 px-3"
                  type="button"
                  title="Actualizar recaudaciones"
                >
                  <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-2">
                <label className="field">
                  <span className="label">Buscar recaudación</span>
                  <span className="admin-search-input">
                    <Search size={17} aria-hidden="true" />
                    <input
                      className="input w-full"
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Pedido, delivery, cliente o cédula..."
                      value={searchTerm}
                    />
                  </span>
                </label>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="field">
                    <span className="label">Periodo</span>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        const val = e.target.value as CashHandoverFilter;
                        setFilterType(val);
                        setStartDate("");
                        setEndDate("");
                        setStartDateInput("");
                        setEndDateInput("");
                      }}
                      className="input w-full"
                    >
                      <option value="all">Todo el historial</option>
                      <option value="day">Día</option>
                      <option value="month">Mes</option>
                      <option value="range">Desde / Hasta</option>
                    </select>
                  </label>
                  <button
                    className="btn btn-secondary self-end px-3"
                    onClick={handleClearFilters}
                    type="button"
                    title="Limpiar filtros"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>

                {filterType === "day" && (
                  <label className="field">
                    <span className="label">Fecha</span>
                    <input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => handleSingleDateInput(e.target.value)}
                      className="input w-full"
                    />
                  </label>
                )}

                {filterType === "month" && (
                  <label className="field">
                    <span className="label">Mes</span>
                    <input
                      type="month"
                      value={startDateInput ? startDateInput.substring(0, 7) : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [year, month] = val.split("-");
                          const firstDay = `${val}-01`;
                          const lastDay = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];
                          setStartDate(firstDay);
                          setEndDate(lastDay);
                          setStartDateInput(firstDay);
                          setEndDateInput(lastDay);
                        } else {
                          setStartDate("");
                          setEndDate("");
                          setStartDateInput("");
                          setEndDateInput("");
                        }
                      }}
                      className="input w-full"
                    />
                  </label>
                )}

                {filterType === "range" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="field">
                      <span className="label">Desde</span>
                      <input
                        type="date"
                        value={startDateInput}
                        onChange={(e) => handleStartDateInput(e.target.value)}
                        className="input w-full"
                      />
                    </label>
                    <label className="field">
                      <span className="label">Hasta</span>
                      <input
                        type="date"
                        value={endDateInput}
                        onChange={(e) => handleEndDateInput(e.target.value)}
                        className="input w-full"
                      />
                    </label>
                  </div>
                )}
              </div>

            </div>

            <div className="grid flex-1 divide-y divide-stone-200 overflow-y-auto">
              {visibleHandovers.map((handover) => {
                const selected = selectedHandoverId === handover.id;
                const status = getHandoverStatus(handover.cash_handover_status);
                const statusDate =
                  status === "confirmed"
                    ? handover.cash_confirmed_at
                    : status === "handed_over"
                      ? handover.cash_handed_over_at
                      : handover.created_at;

                return (
                  <button
                    aria-pressed={selected}
                    className={`provider-row grid grid-cols-[1fr_auto] items-center gap-4 p-5 text-left ${
                      selected ? "provider-row-active" : ""
                    }`}
                    key={handover.id}
                    onClick={() => setSelectedHandoverId(handover.id)}
                    type="button"
                  >
                    <span className="grid min-w-0 gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="font-black text-stone-950">{handover.order_code}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getHandoverBadgeClass(handover.cash_handover_status)}`}>
                          {getHandoverStatusLabel(handover.cash_handover_status)}
                        </span>
                      </span>
                      <span className="text-sm font-medium text-stone-700">{handover.delivery_user_name || "Sin repartidor"}</span>
                      <span className="text-xs text-stone-500">
                        {handover.customer_name || "Consumidor final"} - {formatDateTime(statusDate)}
                      </span>
                    </span>
                    <strong className="text-right text-xl font-black text-stone-950">
                      {formatMoney(handover.total)}
                    </strong>
                  </button>
                );
              })}

              {visibleHandovers.length === 0 && (
                <div className="p-10 text-center text-sm leading-6 text-stone-600">
                  No hay recaudaciones que coincidan con el pedido, delivery, cliente o cédula buscada.
                </div>
              )}
            </div>
          </section>

          <section className="surface catalog-card overflow-hidden">
            {selectedHandover ? (
              <div className="bg-white">
                <header className={`border-b p-6 ${getHandoverPanelClass(selectedHandover.cash_handover_status)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-2">
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${getHandoverBadgeClass(selectedHandover.cash_handover_status)}`}>
                        {getHandoverStatusLabel(selectedHandover.cash_handover_status)}
                      </span>
                      <h3 className="text-2xl font-black text-stone-950">{selectedHandover.order_code}</h3>
                      <p className="text-sm leading-6 text-stone-600">
                        Revisa el efectivo cobrado por el repartidor y cierra la recaudación desde este panel.
                      </p>
                    </div>
                    <strong className="text-3xl font-black text-stone-950">
                      {formatMoney(selectedHandover.total)}
                    </strong>
                  </div>
                </header>

                <div className="grid gap-5 p-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <section className="rounded-lg border border-stone-200 bg-white p-4">
                      <span className="text-xs font-black uppercase text-stone-500">Delivery</span>
                      <strong className="mt-1 block text-lg text-stone-950">{selectedHandover.delivery_user_name || "Sin repartidor"}</strong>
                      <small className="text-stone-500">Cédula: {selectedHandover.delivery_user_identity || "Sin registro"}</small>
                    </section>
                    <section className="rounded-lg border border-stone-200 bg-white p-4">
                      <span className="text-xs font-black uppercase text-stone-500">Cliente</span>
                      <strong className="mt-1 block text-lg text-stone-950">{selectedHandover.customer_name || "Consumidor final"}</strong>
                      <small className="text-stone-500">Pedido registrado: {formatDateTime(selectedHandover.created_at)}</small>
                    </section>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <Clock size={18} className="mb-2 text-amber-600" aria-hidden="true" />
                      <span className="block text-xs font-black uppercase text-amber-700">Reportado</span>
                      <strong className="text-sm text-stone-950">{formatDateTime(selectedHandover.cash_handed_over_at)}</strong>
                    </section>
                    <section className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <ShieldCheck size={18} className="mb-2 text-green-600" aria-hidden="true" />
                      <span className="block text-xs font-black uppercase text-green-700">Confirmado</span>
                      <strong className="text-sm text-stone-950">{formatDateTime(selectedHandover.cash_confirmed_at)}</strong>
                    </section>
                    <section className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <CreditCard size={18} className="mb-2 text-red-600" aria-hidden="true" />
                      <span className="block text-xs font-black uppercase text-red-700">Por confirmar</span>
                      <strong className="text-sm text-stone-950">{getHandoverStatus(selectedHandover.cash_handover_status) === "pending" ? "Sin entregar" : "No aplica"}</strong>
                    </section>
                  </div>

                  {getHandoverStatus(selectedHandover.cash_handover_status) === "handed_over" ? (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-5">
                      <button
                        onClick={() => handleAction([selectedHandover.id], "reject")}
                        disabled={processing}
                        className="btn btn-secondary text-red-600"
                        title="No recibí el dinero"
                        type="button"
                      >
                        <X size={17} aria-hidden="true" />
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleAction([selectedHandover.id], "confirm")}
                        disabled={processing}
                        className="btn btn-primary"
                        type="button"
                      >
                        <Check size={17} aria-hidden="true" />
                        Recibí
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                      <AlertCircle className="mt-0.5 shrink-0 text-stone-500" size={18} aria-hidden="true" />
                      {getHandoverStatus(selectedHandover.cash_handover_status) === "confirmed"
                        ? "Esta recaudación ya fue confirmada por administración."
                        : "Este pedido aún no ha sido reportado como entregado al administrador."}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid min-h-96 place-items-center p-10 text-center">
                <div className="grid max-w-md gap-3">
                  <FileText className="mx-auto brand-icon" size={36} />
                  <h3 className="text-xl font-black">Selecciona una recaudación</h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Haz clic en cualquier registro de la lista izquierda para revisar el efectivo, el repartidor y las acciones disponibles.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      )}
    </div>
  );
}
