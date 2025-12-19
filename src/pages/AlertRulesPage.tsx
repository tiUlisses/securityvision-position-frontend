// src/pages/AlertRulesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client";
import Modal from "../components/common/Modal";

//
// Tipos alinhados com os schemas Pydantic
//

interface PersonGroup {
  id: number;
  name: string;
  description?: string | null;
}

interface Device {
  id: number;
  name: string;
  type: string;
  mac_address?: string | null;
}

interface Person {
  id: number;
  full_name: string;
}

interface AlertRule {
  id: number;
  name: string;
  description?: string | null;
  rule_type: string;
  group_id?: number | null;
  device_id?: number | null;
  max_dwell_seconds?: number | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AlertRulePayload {
  name: string;
  description?: string | null;
  rule_type: string;
  group_id?: number | null;
  device_id?: number | null;
  max_dwell_seconds?: number | null;
  is_active: boolean;
}

interface AlertEvent {
  id: number;
  event_type: string;
  rule_id?: number | null;

  person_id?: number | null;
  tag_id?: number | null;
  device_id?: number | null;

  floor_plan_id?: number | null;
  floor_id?: number | null;
  building_id?: number | null;
  group_id?: number | null;

  started_at: string;
  last_seen_at: string;
  ended_at?: string | null;
  is_open: boolean;

  message?: string | null;
  payload?: string | null;

  first_collection_log_id?: number | null;
  last_collection_log_id?: number | null;
}

const RULE_TYPE_OPTIONS: { value: string; label: string; description: string }[] =
  [
    {
      value: "DWELL_TIME",
      label: "Tempo de permanência",
      description:
        "Dispara se alguém ultrapassar um tempo máximo no gateway selecionado.",
    },
    {
      value: "FORBIDDEN_SECTOR",
      label: "Área proibida",
      description:
        "Dispara se uma pessoa de um grupo específico for detectada neste gateway.",
    },
  ];

type RuleFormMode = "create" | "edit" | null;

const DEFAULT_PAYLOAD: AlertRulePayload = {
  name: "",
  description: "",
  rule_type: "DWELL_TIME",
  group_id: null,
  device_id: null,
  max_dwell_seconds: 300, // 5 minutos padrão
  is_active: true,
};

const formatSeconds = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return s > 0 ? `${m} min ${s} s` : `${m} min`;
  }
  return `${s} s`;
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const AlertRulesPage = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Filtros da listagem de regras
  const [filterRuleType, setFilterRuleType] = useState<string | "">("");
  const [filterGroupId, setFilterGroupId] = useState<number | "">("");
  const [filterDeviceId, setFilterDeviceId] = useState<number | "">("");
  const [filterActive, setFilterActive] = useState<string>("");

  // Modal de criação/edição
  const [formMode, setFormMode] = useState<RuleFormMode>(null);
  const [formData, setFormData] = useState<AlertRulePayload>(DEFAULT_PAYLOAD);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Maps auxiliares para lookup
  const groupsById = useMemo(() => {
    const map: Record<number, PersonGroup> = {};
    groups.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [groups]);

  const devicesById = useMemo(() => {
    const map: Record<number, Device> = {};
    devices.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [devices]);

  const gateways = useMemo(
    () => devices.filter((d) => d.type === "BLE_GATEWAY"),
    [devices]
  );

  const peopleById = useMemo(() => {
    const map: Record<number, Person> = {};
    people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [people]);

  const rulesById = useMemo(() => {
    const map: Record<number, AlertRule> = {};
    rules.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [rules]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (filterRuleType && r.rule_type !== filterRuleType) return false;
      if (filterGroupId !== "" && r.group_id !== Number(filterGroupId))
        return false;
      if (filterDeviceId !== "" && r.device_id !== Number(filterDeviceId))
        return false;
      if (filterActive === "true" && !r.is_active) return false;
      if (filterActive === "false" && r.is_active) return false;
      return true;
    });
  }, [rules, filterRuleType, filterGroupId, filterDeviceId, filterActive]);

  // Carregamento inicial (regras, grupos, devices, pessoas)
  const loadMainData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rulesData, groupsData, devicesData, peopleData] = await Promise.all(
        [
          apiGet<AlertRule[]>("/alert-rules/"),
          apiGet<PersonGroup[]>("/person-groups/"),
          apiGet<Device[]>("/devices/"),
          apiGet<Person[]>("/people/"),
        ]
      );

      setRules(rulesData);
      setGroups(groupsData);
      setDevices(devicesData);
      setPeople(peopleData);
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ?? "Erro ao carregar dados do módulo de alertas."
      );
    } finally {
      setLoading(false);
    }
  };

  // Carrega eventos recentes (histórico)
  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      setEventsError(null);
      const eventsData = await apiGet<AlertEvent[]>("/alert-events/?limit=50");
      setEvents(eventsData);
    } catch (err) {
      console.error(err);
      setEventsError(
        (err as Error)?.message ?? "Erro ao carregar histórico de alertas."
      );
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    void loadMainData();
    void loadEvents();
  }, []);

  // --------------- Form helpers ---------------

  const openCreateModal = () => {
    setFormMode("create");
    setEditingRuleId(null);
    setFormData(DEFAULT_PAYLOAD);
    setFormError(null);
  };

  const openEditModal = (rule: AlertRule) => {
    setFormMode("edit");
    setEditingRuleId(rule.id);
    setFormError(null);

    setFormData({
      name: rule.name,
      description: rule.description ?? "",
      rule_type: rule.rule_type,
      group_id: rule.group_id ?? null,
      device_id: rule.device_id ?? null,
      max_dwell_seconds: rule.max_dwell_seconds ?? null,
      is_active: rule.is_active,
    });
  };

  const closeModal = () => {
    setFormMode(null);
    setEditingRuleId(null);
    setFormError(null);
    setFormData(DEFAULT_PAYLOAD);
  };

  const handleChangeField = (
    field: keyof AlertRulePayload,
    value: string | number | boolean | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      // Sanitizar payload
      const payload: AlertRulePayload = {
        ...formData,
        group_id:
          formData.group_id === "" || formData.group_id === undefined
            ? null
            : formData.group_id,
        device_id:
          formData.device_id === "" || formData.device_id === undefined
            ? null
            : formData.device_id,
            max_dwell_seconds:
            formData.rule_type === "DWELL_TIME"
              ? (formData.max_dwell_seconds ?? 0)
              : null,
      };

      let saved: AlertRule;
      if (formMode === "create") {
        saved = await apiPost<AlertRule>("/alert-rules/", payload);
        setRules((prev) => [saved, ...prev]);
      } else if (formMode === "edit" && editingRuleId != null) {
        saved = await apiPut<AlertRule>(`/alert-rules/${editingRuleId}`, payload);
        setRules((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      } else {
        throw new Error("Modo de formulário inválido.");
      }

      closeModal();
    } catch (err) {
      console.error(err);
      setFormError(
        (err as Error)?.message ?? "Erro ao salvar regra de alerta."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (rule: AlertRule) => {
    const ok = window.confirm(
      `Tem certeza que deseja excluir a regra "${rule.name}"?`
    );
    if (!ok) return;

    try {
      await apiDelete(`/alert-rules/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (err) {
      console.error(err);
      alert(
        (err as Error)?.message ?? "Erro ao excluir a regra de alerta."
      );
    }
  };

  const handleToggleActive = async (rule: AlertRule) => {
    try {
      const updated = await apiPut<AlertRule>(`/alert-rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      console.error(err);
      alert(
        (err as Error)?.message ??
          "Erro ao alterar o status da regra de alerta."
      );
    }
  };

  // --------------- Render ---------------

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Cabeçalho */}
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Regras de Alertas
          </h1>
          <p className="text-sm text-slate-400">
            Configure alertas de permanência (dwell) e áreas proibidas por
            grupo e gateway. Abaixo você também vê um histórico recente de
            alertas disparados.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-md bg-sv-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sv-accentSoft"
          >
            Nova regra
          </button>
          <button
            type="button"
            onClick={() => {
              void loadMainData();
              void loadEvents();
            }}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-sm hover:bg-slate-700"
          >
            Atualizar
          </button>
        </div>
      </header>

      {/* Filtros + Lista de regras */}
      <section className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        {/* Coluna esquerda: Regras */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-100">
            Regras configuradas
          </h2>

          {/* Filtros */}
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-xs">
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              value={filterRuleType}
              onChange={(e) => setFilterRuleType(e.target.value || "")}
            >
              <option value="">Tipo (todos)</option>
              {RULE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              value={filterGroupId}
              onChange={(e) =>
                setFilterGroupId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Grupo (todos)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              value={filterDeviceId}
              onChange={(e) =>
                setFilterDeviceId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Gateway (todos)</option>
              {gateways.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.mac_address || `Device #${d.id}`}
                </option>
              ))}
            </select>

            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="">Status (todos)</option>
              <option value="true">Ativas</option>
              <option value="false">Inativas</option>
            </select>
          </div>

          {/* Lista de regras */}
          <div className="mt-2 space-y-2 text-sm">
            {loading && (
              <div className="text-xs text-slate-400">
                Carregando regras...
              </div>
            )}

            {!loading && filteredRules.length === 0 && (
              <div className="text-xs text-slate-500">
                Nenhuma regra encontrada com os filtros atuais.
              </div>
            )}

            {!loading &&
              filteredRules.map((rule) => {
                const ruleTypeMeta =
                  RULE_TYPE_OPTIONS.find((r) => r.value === rule.rule_type) ??
                  RULE_TYPE_OPTIONS[0];
                const group = rule.group_id
                  ? groupsById[rule.group_id]
                  : undefined;
                const device = rule.device_id
                  ? devicesById[rule.device_id]
                  : undefined;

                return (
                  <div
                    key={rule.id}
                    className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-50 font-medium">
                            {rule.name}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              rule.is_active
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-700/40 text-slate-300 border border-slate-600"
                            }`}
                          >
                            {rule.is_active ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Tipo:{" "}
                          <span className="font-medium">
                            {ruleTypeMeta.label}
                          </span>
                        </div>
                        {rule.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {rule.description}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="text-[11px] px-2 py-1 rounded bg-rose-700 text-slate-50 hover:bg-rose-600"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                        >
                          {rule.is_active ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-1 text-[11px] text-slate-400 md:grid-cols-2">
                      <div>
                        <span className="font-semibold">Grupo:</span>{" "}
                        {group ? group.name : "Qualquer pessoa"}
                      </div>
                      <div>
                        <span className="font-semibold">Gateway:</span>{" "}
                        {device
                          ? device.name ||
                            device.mac_address ||
                            `Device #${device.id}`
                          : "Não especificado"}
                      </div>
                      {rule.rule_type === "DWELL_TIME" && (
                        <div>
                          <span className="font-semibold">
                            Tempo máximo:
                          </span>{" "}
                          {formatSeconds(rule.max_dwell_seconds ?? null)}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold">Criada em:</span>{" "}
                        {formatDateTime(rule.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {error && (
            <p className="mt-2 text-xs text-rose-400">
              Erro ao carregar regras: {error}
            </p>
          )}
        </div>

        {/* Coluna direita: Histórico de alertas */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-slate-100">
                Histórico recente de alertas
              </h2>
              <p className="text-[11px] text-slate-400">
                Mostrando os últimos 50 eventos (ordenados do mais recente para
                o mais antigo).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
            >
              Atualizar
            </button>
          </div>

          {loadingEvents && (
            <div className="text-xs text-slate-400">
              Carregando eventos...
            </div>
          )}

          {eventsError && (
            <div className="text-xs text-rose-400">
              Erro ao carregar eventos: {eventsError}
            </div>
          )}

          {!loadingEvents && events.length === 0 && !eventsError && (
            <div className="text-xs text-slate-500">
              Nenhum alerta registrado ainda.
            </div>
          )}

          {!loadingEvents && events.length > 0 && (
            <div className="mt-2 max-h-[420px] overflow-y-auto space-y-1 text-xs">
              {events.map((ev) => {
                const rule = ev.rule_id ? rulesById[ev.rule_id] : undefined;
                const person = ev.person_id
                  ? peopleById[ev.person_id]
                  : undefined;
                const device = ev.device_id
                  ? devicesById[ev.device_id!]
                  : undefined;
                  let payloadObj: any = null;
                  try {
                    payloadObj = ev.payload ? JSON.parse(ev.payload) : null;
                  } catch {
                    payloadObj = null;
                  }
                  
                  const started = new Date(ev.started_at);
                  const lastSeen = new Date(ev.last_seen_at);
                  const ended = ev.ended_at ? new Date(ev.ended_at) : null;
                  
                  const durationSeconds =
                    typeof payloadObj?.duration_seconds === "number"
                      ? payloadObj.duration_seconds
                      : (() => {
                          if (Number.isNaN(started.getTime()) || Number.isNaN(lastSeen.getTime())) return null;
                          const end = ended && !Number.isNaN(ended.getTime()) ? ended : lastSeen;
                          return Math.max(0, Math.floor((end.getTime() - started.getTime()) / 1000));
                        })();
                  
                  const closeReason = payloadObj?.close_reason ?? null;
                return (
                  <div
                    key={ev.id}
                    className="rounded border border-slate-800 bg-slate-900 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-300">
                        <span className="font-semibold">
                          {rule?.name ?? "Alerta sem regra"}
                        </span>
                        <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-300">
                          {ev.event_type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDateTime(ev.started_at)}
                      </div>
                    </div>

                    <div className="mt-1 grid gap-1 text-[11px] text-slate-400 md:grid-cols-2">
                      <div>
                        <span className="font-semibold">Pessoa:</span>{" "}
                        {person
                          ? person.full_name
                          : ev.person_id
                          ? `ID ${ev.person_id}`
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-semibold">Gateway:</span>{" "}
                        {device
                          ? device.name ||
                            device.mac_address ||
                            `Device #${device.id}`
                          : ev.device_id
                          ? `ID ${ev.device_id}`
                          : "N/A"}
                      </div>
                      {ev.payload && (
                        <div className="md:col-span-2">
                          <span className="font-semibold">Detalhes:</span>{" "}
                          <span className="font-mono text-[10px] text-slate-300">
                            {ev.payload}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Modal de criação/edição de regra */}
      {formMode && (
        <Modal
          isOpen={true}
          title={
            formMode === "create"
              ? "Nova regra de alerta"
              : "Editar regra de alerta"
          }
          onClose={closeModal}
          maxWidthClass="max-w-2xl"
        >
          <form onSubmit={handleSubmitForm} className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Nome
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  value={formData.name}
                  onChange={(e) => handleChangeField("name", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Tipo de regra
                </label>
                <select
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  value={formData.rule_type}
                  onChange={(e) =>
                    handleChangeField("rule_type", e.target.value)
                  }
                  required
                >
                  {RULE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  {
                    RULE_TYPE_OPTIONS.find(
                      (o) => o.value === formData.rule_type
                    )?.description
                  }
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Grupo (opcional)
                </label>
                <select
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  value={formData.group_id ?? ""}
                  onChange={(e) =>
                    handleChangeField(
                      "group_id",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Qualquer pessoa</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Gateway
                </label>
                <select
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  value={formData.device_id ?? ""}
                  onChange={(e) =>
                    handleChangeField(
                      "device_id",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  required
                >
                  <option value="">Selecione um gateway...</option>
                  {gateways.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.mac_address || `Device #${d.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {formData.rule_type === "DWELL_TIME" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Tempo máximo de permanência (segundos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    value={formData.max_dwell_seconds ?? ""}
                    onChange={(e) =>
                      handleChangeField(
                        "max_dwell_seconds",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Exemplo: 300 = 5 minutos.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="rule_active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sv-accent"
                  checked={formData.is_active}
                  onChange={(e) =>
                    handleChangeField("is_active", e.target.checked)
                  }
                />
                <label
                  htmlFor="rule_active"
                  className="text-xs font-medium text-slate-300"
                >
                  Regra ativa
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Descrição (opcional)
              </label>
              <textarea
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                rows={3}
                value={formData.description ?? ""}
                onChange={(e) =>
                  handleChangeField("description", e.target.value)
                }
              />
            </div>

            {formError && (
              <p className="text-xs text-rose-400">{formError}</p>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-sv-accent px-3 py-1.5 text-xs text-white hover:bg-sv-accentSoft disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : formMode === "create"
                  ? "Criar regra"
                  : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AlertRulesPage;
