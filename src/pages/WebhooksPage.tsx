import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";

interface WebhookSubscription {
  id: number;
  name: string;
  url: string;
  secret_token?: string | null;
  event_type_filter?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookEventTypeMeta {
  event_type: string;
  label: string;
  description: string;
  sample_payload: unknown;
}

interface WebhookFormState {
  id?: number;
  name: string;
  url: string;
  secret_token: string;
  event_type_filter: string; // "" significa "todos os eventos"
  is_active: boolean;
}

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [eventTypes, setEventTypes] = useState<WebhookEventTypeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(
    null
  );

  const [form, setForm] = useState<WebhookFormState>({
    name: "",
    url: "",
    secret_token: "",
    event_type_filter: "", // "" = qualquer evento
    is_active: true,
  });

  // ---------------------------------------------------------------------------
  // Carrega subscriptions + tipos de evento
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const [subs, types] = await Promise.all([
          apiGet<WebhookSubscription[]>("/webhooks/"),
          apiGet<WebhookEventTypeMeta[]>("/webhooks/event-types"),
        ]);

        setWebhooks(subs);
        setEventTypes(types);

        // Se formulário ainda não tem tipo definido, deixa "todos" (string vazia)
        setForm((prev) => ({
          ...prev,
          event_type_filter: prev.event_type_filter || "",
        }));
      } catch (err) {
        console.error(err);
        setError((err as Error)?.message ?? "Erro ao carregar webhooks.");
      } finally {
        setLoading(false);
      }
    }

    void loadAll();
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const eventTypeOptions = useMemo(
    () => eventTypes,
    [eventTypes]
  );

  const selectedEventMeta = useMemo(
    () =>
      form.event_type_filter
        ? eventTypes.find((t) => t.event_type === form.event_type_filter) ?? null
        : null,
    [eventTypes, form.event_type_filter]
  );

  // Envelope de preview que o cliente receberia
  const previewEnvelope = useMemo(() => {
    const payload =
      selectedEventMeta?.sample_payload ??
      (form.event_type_filter
        ? { example: "Payload de exemplo para este evento." }
        : { example: "Exemplo genérico para qualquer evento." });

    return {
      event_type: form.event_type_filter || "<ANY>",
      timestamp: "<ISO-8601 gerado no envio>",
      payload,
    };
  }, [selectedEventMeta, form.event_type_filter]);

  function resetForm() {
    setSelectedWebhookId(null);
    setForm({
      id: undefined,
      name: "",
      url: "",
      secret_token: "",
      event_type_filter: "",
      is_active: true,
    });
  }

  function handleSelectWebhook(sub: WebhookSubscription) {
    setSelectedWebhookId(sub.id);
    setForm({
      id: sub.id,
      name: sub.name,
      url: sub.url,
      secret_token: sub.secret_token ?? "",
      event_type_filter: sub.event_type_filter ?? "",
      is_active: sub.is_active,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: form.name,
        url: form.url,
        secret_token: form.secret_token || null,
        // string vazia -> null = todos os eventos
        event_type_filter: form.event_type_filter || null,
        is_active: form.is_active,
      };

      let saved: WebhookSubscription;

      if (form.id) {
        saved = await apiPut<WebhookSubscription>(
          `/webhooks/${form.id}`,
          payload
        );
      } else {
        saved = await apiPost<WebhookSubscription>("/webhooks/", payload);
      }

      setWebhooks((prev) => {
        const idx = prev.findIndex((w) => w.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        const clone = [...prev];
        clone[idx] = saved;
        return clone;
      });

      setSelectedWebhookId(saved.id);
      setForm((prev) => ({ ...prev, id: saved.id }));
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message ?? "Erro ao salvar webhook.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Deseja realmente excluir este webhook?")) return;
    try {
      await apiDelete(`/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (selectedWebhookId === id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message ?? "Erro ao excluir webhook.");
    }
  }

  async function handleToggleActive(sub: WebhookSubscription) {
    try {
      const updated = await apiPut<WebhookSubscription>(`/webhooks/${sub.id}`, {
        is_active: !sub.is_active,
      });
      setWebhooks((prev) =>
        prev.map((w) => (w.id === updated.id ? updated : w))
      );
      if (selectedWebhookId === updated.id) {
        setForm((prev) => ({ ...prev, is_active: updated.is_active }));
      }
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message ?? "Erro ao atualizar webhook.");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Webhooks & Integrações
          </h1>
          <p className="text-sm text-slate-500">
            Configure endpoints para receber eventos do SecurityVision-Position
            (CRUD de prédios, gateways, pessoas, tags e eventos do motor de
            alertas).
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Novo webhook
        </button>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        {/* Lista de webhooks */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Webhooks cadastrados
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-400">Carregando…</span>
            )}
          </div>

          {webhooks.length === 0 && !loading ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Nenhum webhook cadastrado. Clique em &quot;Novo webhook&quot; para
              adicionar.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {webhooks.map((w) => {
                const meta =
                  w.event_type_filter &&
                  eventTypes.find(
                    (m) => m.event_type === (w.event_type_filter ?? "")
                  );

                const typeLabel = w.event_type_filter
                  ? meta
                    ? `${meta.label} (${meta.event_type})`
                    : w.event_type_filter
                  : "Todos os eventos";

                return (
                  <li
                    key={w.id}
                    className={`flex cursor-pointer items-start justify-between gap-2 px-2 py-2 text-xs hover:bg-slate-50 ${
                      selectedWebhookId === w.id ? "bg-slate-50" : ""
                    }`}
                    onClick={() => handleSelectWebhook(w)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {w.name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            w.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleToggleActive(w);
                          }}
                        >
                          {w.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {w.url}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Tipo de evento:&nbsp;
                        {typeLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-rose-500 hover:text-rose-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(w.id);
                      }}
                    >
                      Excluir
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Formulário + preview do JSON */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Configuração do webhook
          </h2>

          <form className="space-y-3" onSubmit={handleSave}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Nome
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex.: Webhook Gateway Offline"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  URL de destino
                </label>
                <input
                  type="url"
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={form.url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://meu-servidor.com/webhooks/rtls"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Tipo de evento
                </label>
                <select
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={form.event_type_filter}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      event_type_filter: e.target.value,
                    }))
                  }
                >
                  <option value="">
                    Todos os eventos (event_type_filter = NULL)
                  </option>
                  {eventTypeOptions.map((t) => (
                    <option key={t.event_type} value={t.event_type}>
                      {t.label} ({t.event_type})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Selecione um tipo de evento específico ou deixe
                  &quot;Todos os eventos&quot; para receber qualquer coisa
                  (FORBIDDEN_SECTOR, GATEWAY_OFFLINE, DEVICE_CREATED, etc.).
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Secret token (opcional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={form.secret_token}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      secret_token: e.target.value,
                    }))
                  }
                  placeholder="Token para validação no seu servidor"
                />
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      form.is_active ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    <span>Webhook ativo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {saving
                  ? "Salvando…"
                  : form.id
                  ? "Salvar alterações"
                  : "Criar webhook"}
              </button>
            </div>
          </form>

          {/* Preview do envelope JSON */}
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700">
                  Preview do envelope JSON
                </span>
                {form.event_type_filter === "" ? (
                  <p className="text-[11px] text-slate-500">
                    Exemplo genérico de envelope para qualquer evento. O campo{" "}
                    <code>event_type</code> varia conforme o tipo disparado.
                  </p>
                ) : selectedEventMeta ? (
                  <p className="text-[11px] text-slate-500">
                    {selectedEventMeta.description}
                  </p>
                ) : null}
              </div>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-[11px] text-slate-100">
              {JSON.stringify(previewEnvelope, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WebhooksPage;
