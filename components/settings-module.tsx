"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Save, X, Loader2, Building, ChevronDown, ChevronUp } from "lucide-react";

export type TransferAccountRecord = {
  account_number: string;
  bank_name: string;
  created_at?: string;
  email: string | null;
  holder_name: string;
  id: string;
  identity_number: string;
  is_enabled: boolean;
  updated_at?: string;
};

export default function SettingsModule() {
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState<TransferAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TransferAccountRecord>>({});

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/transfer-accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || "Failed to load accounts");
      }
    } catch (e) {
      setError("Network error loading accounts");
    } finally {
      setLoading(false);
    }
  }

  async function saveAccount() {
    if (!editForm.bank_name || !editForm.holder_name || !editForm.identity_number || !editForm.account_number) {
      alert("Por favor complete los campos obligatorios");
      return;
    }

    try {
      const isNew = isCreating;
      const url = isNew ? "/api/admin/transfer-accounts" : `/api/admin/transfer-accounts/${isEditing}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setIsEditing(null);
        setIsCreating(false);
        setEditForm({});
        loadAccounts();
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar");
      }
    } catch (e) {
      alert("Network error");
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("¿Seguro que deseas eliminar esta cuenta?")) return;
    try {
      const res = await fetch(`/api/admin/transfer-accounts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadAccounts();
      } else {
        const data = await res.json();
        alert(data.error || "Error al eliminar");
      }
    } catch (e) {
      alert("Network error");
    }
  }

  async function toggleAccountStatus(id: string, newStatus: boolean) {
    const backup = [...accounts];
    setAccounts(accounts.map(a => a.id === id ? { ...a, is_enabled: newStatus } : a));
    try {
      const res = await fetch(`/api/admin/transfer-accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: newStatus }),
      });
      if (!res.ok) {
        setAccounts(backup);
        const data = await res.json();
        alert(data.error || "Error al actualizar el estado");
      }
    } catch (e) {
      setAccounts(backup);
      alert("Error de red");
    }
  }

  return (
    <div className="grid gap-4">
      <div 
        className="flex items-center justify-between cursor-pointer bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Cuentas Bancarias
            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Administra las cuentas de transferencia bancaria</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
            setIsCreating(true);
            setIsEditing("new");
            setEditForm({ is_enabled: true });
          }}
          className="flex items-center gap-2 bg-[#A60B3F] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </button>
      </div>

      {isOpen && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {(isCreating || accounts.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs">
                  <tr>
                    <th className="px-6 py-4">Banco</th>
                    <th className="px-6 py-4">Titular</th>
                    <th className="px-6 py-4">Cédula/RUC</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">No. Cuenta</th>
                    <th className="px-6 py-4 text-center">Mostrar a Clientes</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isCreating && (
                    <tr className="bg-blue-50/30">
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Nombre del Banco"
                          className="w-full text-sm border-gray-300 rounded focus:ring-[#A60B3F] focus:border-[#A60B3F]"
                          value={editForm.bank_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Nombre Titular"
                          className="w-full text-sm border-gray-300 rounded focus:ring-[#A60B3F] focus:border-[#A60B3F]"
                          value={editForm.holder_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, holder_name: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Cédula/RUC"
                          className="w-[120px] text-sm border-gray-300 rounded focus:ring-[#e91e63] focus:border-[#e91e63]"
                          value={editForm.identity_number || ""}
                          onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="email"
                          placeholder="Correo"
                          className="w-full text-sm border-gray-300 rounded focus:ring-[#e91e63] focus:border-[#e91e63]"
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="No. Cuenta"
                          className="w-full text-sm border-gray-300 rounded focus:ring-[#e91e63] focus:border-[#e91e63]"
                          value={editForm.account_number || ""}
                          onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded text-[#A60B3F] focus:ring-[#A60B3F]"
                          checked={editForm.is_enabled ?? true}
                          onChange={(e) => setEditForm({ ...editForm, is_enabled: e.target.checked })}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setIsCreating(false); setIsEditing(null); }} className="p-1.5 text-gray-500 hover:text-gray-900 rounded">
                            <X className="w-5 h-5" />
                          </button>
                          <button onClick={saveAccount} className="p-1.5 text-[#A60B3F] hover:bg-rose-50 rounded">
                            <Save className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {accounts.map(account => {
                    if (isEditing === account.id) {
                      return (
                        <tr key={account.id} className="bg-blue-50/30">
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="w-full text-sm border-gray-300 rounded focus:ring-[#A60B3F] focus:border-[#A60B3F]"
                              value={editForm.bank_name || ""}
                              onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="w-full text-sm border-gray-300 rounded focus:ring-[#A60B3F] focus:border-[#A60B3F]"
                              value={editForm.holder_name || ""}
                              onChange={(e) => setEditForm({ ...editForm, holder_name: e.target.value })}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="w-[120px] text-sm border-gray-300 rounded focus:ring-[#e91e63] focus:border-[#e91e63]"
                              value={editForm.identity_number || ""}
                              onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="email"
                              className="w-full text-sm border-gray-300 rounded focus:ring-[#e91e63] focus:border-[#e91e63]"
                              value={editForm.email || ""}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="w-full text-sm border-gray-300 rounded focus:ring-[#e91e63] focus:border-[#e91e63]"
                              value={editForm.account_number || ""}
                              onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              className="rounded text-[#A60B3F] focus:ring-[#A60B3F]"
                              checked={editForm.is_enabled ?? true}
                              onChange={(e) => setEditForm({ ...editForm, is_enabled: e.target.checked })}
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setIsEditing(null); }} className="p-1.5 text-gray-500 hover:text-gray-900 rounded">
                                <X className="w-5 h-5" />
                              </button>
                              <button onClick={saveAccount} className="p-1.5 text-[#A60B3F] hover:bg-rose-50 rounded">
                                <Save className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            {account.bank_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {account.holder_name}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {account.identity_number}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {account.email || "-"}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-700">
                          {account.account_number}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer justify-center">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={account.is_enabled}
                              onChange={(e) => toggleAccountStatus(account.id, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e91e63]"></div>
                          </label>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setIsEditing(account.id);
                                setEditForm(account);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAccount(account.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isCreating && accounts.length === 0 && !loading && (
            <div className="text-center py-16 px-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin cuentas configuradas</h3>
              <p className="text-sm text-gray-500 mb-4">
                No hay cuentas bancarias para transferencias actualmente.
              </p>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing("new");
                  setEditForm({ is_enabled: true });
                }}
                className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Cuenta
              </button>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
