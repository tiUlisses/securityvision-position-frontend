// securityvision-position-frontend/src/pages/IncidentRulesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api/client";

interface Device {
  id: number;
  name: string;
  code?: string | null;
  type: string;
}

interface CameraGroup {
  id: number;
  name: string;
  description?: string | null;
}

interface SupportGroup {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  // se quiser pode adicionar os outros campos (default_sla_minutes etc.)
}

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type RuleScope = "GLOBAL" | "DEVICE" | "GROUP";
type ScopeFilter = "ALL" | RuleScope;

interface IncidentRule {
  id: number;
  name: string;
  enabled: boolean;
  analytic_type: string;
  device_id?: number | null;
  camera_group_id?: number | null;
  tenant?: string | null;
  severity: Severity;
  title_template?: string | null;
  description_template?: string | null;
  assigned_to_user_id?: number | null;
  assigned_group_id?: number | null; // 👈 agora exposto
  created_at: string;
  updated_at: string;
}

type NewRuleScope = "GLOBAL" | "DEVICE" | "GROUP";

interface NewRuleForm {
  name: string;
  enabled: boolean;
  analytic_type: string;
  scope: NewRuleScope;
  device_id: string;        // id em string pra usar em <select>
  camera_group_id: string;  // id em string pra usar em <select>
  severity: Severity;
  title_template: string;
  description_template: string;
  assigned_group_id: string; // 👈 string para o <select>
}

export function IncidentRulesPage() {
  const [rules, setRules] = useState<IncidentRule[]>([]);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [groups, setGroups] = useState<CameraGroup[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");

  const [form, setForm] = useState<NewRuleForm>({
    name: "",
    enabled: true,
    analytic_type: "faceRecognized",
    scope: "GLOBAL",
    device_id: "",
    camera_group_id: "",
    severity: "MEDIUM",
    title_template: "",
    description_template: "",
    assigned_group_id: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [rulesResp, camsResp, groupsResp, supportGroupsResp] =
        await Promise.all([
          apiGet<IncidentRule[]>("/incident-rules/"),
          apiGet<Device[]>("/devices/cameras/"),
          apiGet<CameraGroup[]>("devices/camera-groups/"),
          apiGet<SupportGroup[]>("/support-groups/"),
        ]);

      setRules(rulesResp);
      setCameras(camsResp);
      setGroups(groupsResp);
      setSupportGroups(supportGroupsResp);
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ??
          "Falha ao carregar regras de incidentes automáticos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const handleChange = (
    field: keyof NewRuleForm,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getRuleScope = (rule: IncidentRule): RuleScope => {
    if (rule.device_id != null) return "DEVICE";
    if (rule.camera_group_id != null) return "GROUP";
    return "GLOBAL";
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // filtro por escopo
      const scope = getRuleScope(rule);
      if (scopeFilter !== "ALL" && scopeFilter !== scope) {
        return false;
      }

      if (!normalizedSearch) return true;

      const camera =
        rule.device_id != null
          ? cameras.find((c) => c.id === rule.device_id)
          : undefined;
      const cameraGroup =
        rule.camera_group_id != null
          ? groups.find((g) => g.id === rule.camera_group_id)
          : undefined;

      const supportGroup =
        rule.assigned_group_id != null
          ? supportGroups.find((sg) => sg.id === rule.assigned_group_id)
          : undefined;

      const haystack = [
        rule.name,
        rule.analytic_type,
        camera?.name,
        camera?.code ?? "",
        cameraGroup?.name,
        supportGroup?.name, // 👈 também busca por nome do grupo de atendimento
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [rules, cameras, groups, supportGroups, scopeFilter, normalizedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.name.trim()) {
        throw new Error("Informe um nome para a regra.");
      }
      if (!form.analytic_type.trim()) {
        throw new Error("Informe o tipo de analítico.");
      }

      if (form.scope === "DEVICE" && !form.device_id) {
        throw new Error("Selecione uma câmera para a regra.");
      }

      if (form.scope === "GROUP" && !form.camera_group_id) {
        throw new Error("Selecione um grupo de câmeras para a regra.");
      }

      const payload: any = {
        name: form.name.trim(),
        enabled: form.enabled,
        analytic_type: form.analytic_type.trim(),
        severity: form.severity,
        title_template: form.title_template.trim() || null,
        description_template: form.description_template.trim() || null,
      };

      // Escopo: GLOBAL / DEVICE / GROUP
      if (form.scope === "GLOBAL") {
        payload.device_id = null;
        payload.camera_group_id = null;
      } else if (form.scope === "DEVICE") {
        payload.device_id = Number(form.device_id);
        payload.camera_group_id = null;
      } else if (form.scope === "GROUP") {
        payload.device_id = null;
        payload.camera_group_id = Number(form.camera_group_id);
      }

      // Grupo de atendimento (SupportGroup)
      if (form.assigned_group_id) {
        payload.assigned_group_id = Number(form.assigned_group_id);
      } else {
        payload.assigned_group_id = null;
      }

      await apiPost<IncidentRule>("/incident-rules/", payload);

      // reset básico do form
      setForm((prev) => ({
        ...prev,
        name: "",
        title_template: "",
        description_template: "",
        assigned_group_id: "",
        // mantemos analytic_type, scope e severity para facilitar criação em lote
      }));

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ??
          "Falha ao criar regra de incidente automático."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleEnabled = async (rule: IncidentRule) => {
    try {
      await apiPatch<IncidentRule>(`/incident-rules/${rule.id}`, {
        enabled: !rule.enabled,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ?? "Falha ao atualizar status da regra."
      );
    }
  };

  const deleteRule = async (rule: IncidentRule) => {
    if (!window.confirm(`Remover a regra "${rule.name}"?`)) return;
    try {
      await apiDelete(`/incident-rules/${rule.id}`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ?? "Falha ao remover regra de incidente."
      );
    }
  };

  const getRuleTargetLabel = (rule: IncidentRule): string => {
    const scope = getRuleScope(rule);
    if (scope === "GLOBAL") {
      return "Qualquer câmera";
    }

    if (scope === "DEVICE" && rule.device_id != null) {
      const camera = cameras.find((c) => c.id === rule.device_id);
      if (!camera) return `Câmera #${rule.device_id}`;
      return (camera as any).code || camera.name || `Câmera #${camera.id}`;
    }

    if (scope === "GROUP" && rule.camera_group_id != null) {
      const group = groups.find((g) => g.id === rule.camera_group_id);
      if (!group) return `Grupo #${rule.camera_group_id}`;
      return `Grupo: ${group.name}`;
    }

    return "—";
  };

  const getScopeLabel = (rule: IncidentRule): string => {
    const scope = getRuleScope(rule);
    if (scope === "GLOBAL") return "Global";
    if (scope === "DEVICE") return "Câmera";
    return "Grupo";
  };

  const getSupportGroupLabel = (rule: IncidentRule): string => {
    if (rule.assigned_group_id == null) return "—";
    const sg = supportGroups.find((g) => g.id === rule.assigned_group_id);
    if (!sg) return `Grupo de atendimento #${rule.assigned_group_id}`;
    return sg.name;
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Regras de Incidentes Automáticos
          </h1>
          <p className="text-sm text-slate-500">
            Defina quais analíticos em quais câmeras ou grupos de câmeras devem
            gerar incidentes automaticamente, e para qual grupo de atendimento
            serão encaminhados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Atualizar
        </button>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Formulário de nova regra */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          Nova regra de incidente
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Informe um nome, selecione o escopo (global, por câmera ou por grupo)
          e o tipo de analítico exatamente como vem no evento (ex.:{" "}
          <code className="rounded bg-slate-100 px-1">faceRecognized</code>,{" "}
          <code className="rounded bg-slate-100 px-1">FaceDetection</code>).
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
          {/* Nome da regra */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Nome da regra
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          {/* Tipo de analítico */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Tipo de analítico
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.analytic_type}
              onChange={(e) => handleChange("analytic_type", e.target.value)}
              placeholder="faceRecognized, FaceDetection, ..."
              required
            />
          </div>

          {/* Escopo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Escopo da regra
            </label>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.scope}
              onChange={(e) =>
                handleChange("scope", e.target.value as NewRuleScope)
              }
            >
              <option value="GLOBAL">Qualquer câmera</option>
              <option value="DEVICE">Câmera específica</option>
              <option value="GROUP">Grupo de câmeras</option>
            </select>
          </div>

          {/* Severidade */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Severidade
            </label>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.severity}
              onChange={(e) =>
                handleChange("severity", e.target.value as Severity)
              }
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Grupo de atendimento (SupportGroup) */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">
              Grupo de atendimento (opcional)
            </label>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.assigned_group_id}
              onChange={(e) =>
                handleChange("assigned_group_id", e.target.value)
              }
            >
              <option value="">Nenhum (depois será atribuído manualmente)</option>
              {supportGroups
                .filter((sg) => sg.is_active)
                .map((sg) => (
                  <option key={sg.id} value={sg.id}>
                    {sg.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Esse é o grupo que receberá automaticamente os incidentes gerados
              por esta regra.
            </p>
          </div>

          {/* Câmera (quando escopo = DEVICE) */}
          {form.scope === "DEVICE" && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600">
                Câmera alvo
              </label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.device_id}
                onChange={(e) => handleChange("device_id", e.target.value)}
              >
                <option value="">Selecione uma câmera</option>
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {(cam as any).code || cam.name || `CAM ${cam.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grupo (quando escopo = GROUP) */}
          {form.scope === "GROUP" && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-600">
                Grupo de câmeras
              </label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.camera_group_id}
                onChange={(e) =>
                  handleChange("camera_group_id", e.target.value)
                }
              >
                <option value="">Selecione um grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Template título */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">
              Template do título (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.title_template}
              onChange={(e) =>
                handleChange("title_template", e.target.value)
              }
              placeholder="[AUTO] {analytic_type} na câmera {camera_name}"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Suporta placeholders como{" "}
              <code className="rounded bg-slate-100 px-1">
                {"{analytic_type}"}
              </code>{" "}
              e{" "}
              <code className="rounded bg-slate-100 px-1">
                {"{camera_name}"}
              </code>
              .
            </p>
          </div>

          {/* Template descrição */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">
              Template da descrição (opcional)
            </label>
            <textarea
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              rows={3}
              value={form.description_template}
              onChange={(e) =>
                handleChange("description_template", e.target.value)
              }
              placeholder="Incidente automático pela regra {rule_name}..."
            />
          </div>

          <div className="flex items-center justify-between md:col-span-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={form.enabled}
                onChange={(e) => handleChange("enabled", e.target.checked)}
              />
              Regra ativa
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Criar regra"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de regras existentes */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Regras configuradas
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Cada regra pode ser global (qualquer câmera), por câmera
              específica ou por grupo de câmeras. Quando um evento de câmera
              chega com o analítico configurado, um incidente é criado
              automaticamente e pode ser atribuído a um grupo de atendimento.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 md:items-center">
            <span className="text-xs text-slate-500">
              {rules.length} regra{rules.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Filtros da listagem */}
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Buscar por nome, analítico, câmera, grupo ou grupo de atendimento..."
            className="w-full md:w-72 rounded-md border px-2 py-1.5 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">Filtrar por escopo:</span>
            <select
              className="rounded-md border px-2 py-1 text-[11px]"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            >
              <option value="ALL">Todos</option>
              <option value="GLOBAL">Global</option>
              <option value="DEVICE">Câmera</option>
              <option value="GROUP">Grupo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 text-xs text-slate-400">
            Carregando regras...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Nenhuma regra encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Ativa
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Nome
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Analítico
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Escopo
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Alvo
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Grupo de atendimento
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">
                    Severidade
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void toggleRuleEnabled(rule)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          rule.enabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {rule.enabled ? "Ativa" : "Inativa"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-800">
                      {rule.name}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {rule.analytic_type || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {getScopeLabel(rule)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {getRuleTargetLabel(rule)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {getSupportGroupLabel(rule)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-50">
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteRule(rule)}
                        className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default IncidentRulesPage;
