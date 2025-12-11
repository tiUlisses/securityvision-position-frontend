// securityvision-position-frontend/src/pages/IncidentRulesPage.tsx
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api/client";

interface Device {
  id: number;
  name: string;
  code?: string | null;
  type: string;
}

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface IncidentRule {
  id: number;
  name: string;
  enabled: boolean;
  analytic_type: string;
  device_id?: number | null;
  tenant?: string | null;
  severity: Severity;
  title_template?: string | null;
  description_template?: string | null;
  assigned_to_user_id?: number | null;
  created_at: string;
  updated_at: string;
}

interface NewRuleForm {
  name: string;
  enabled: boolean;
  analytic_type: string;
  device_id: string; // vamos guardar como string pra facilitar select
  severity: Severity;
  title_template: string;
  description_template: string;
}

export function IncidentRulesPage() {
  const [rules, setRules] = useState<IncidentRule[]>([]);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<NewRuleForm>({
    name: "",
    enabled: true,
    analytic_type: "faceRecognized",
    device_id: "",
    severity: "MEDIUM",
    title_template: "",
    description_template: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [rulesResp, camsResp] = await Promise.all([
        apiGet<IncidentRule[]>("/incident-rules/"),
        apiGet<Device[]>("/devices/cameras/"),
      ]);

      setRules(rulesResp);
      setCameras(camsResp);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: form.name,
        enabled: form.enabled,
        analytic_type: form.analytic_type,
        severity: form.severity,
        title_template: form.title_template || null,
        description_template: form.description_template || null,
      };

      if (form.device_id) {
        payload.device_id = Number(form.device_id);
      } else {
        payload.device_id = null;
      }

      await apiPost<IncidentRule>("/incident-rules/", payload);

      // reseta form básico
      setForm((prev) => ({
        ...prev,
        name: "",
        title_template: "",
        description_template: "",
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

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Regras de Incidentes Automáticos
          </h1>
          <p className="text-sm text-slate-500">
            Configure quais analíticos de quais câmeras devem gerar incidentes
            automaticamente. Nesta primeira versão, a regra é por câmera +
            tipo de analítico.
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
          Defina um nome, selecione a câmera (ou deixe em branco para regra
          global) e informe o tipo de analítico exatamente como vem no evento
          (ex.: <code className="rounded bg-slate-100 px-1">faceRecognized</code>).
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Câmera (opcional)
            </label>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              value={form.device_id}
              onChange={(e) => handleChange("device_id", e.target.value)}
            >
              <option value="">Qualquer câmera</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {(cam as any).code || cam.name || `CAM ${cam.id}`}
                </option>
              ))}
            </select>
          </div>

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
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Regras configuradas
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Cada regra pode ser global (qualquer câmera) ou específica de uma
              câmera. Quando um evento de câmera chega com o analítico
              configurado, um incidente é criado automaticamente.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {rules.length} regra{rules.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="mt-3 text-xs text-slate-400">
            Carregando regras...
          </div>
        ) : rules.length === 0 ? (
          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Nenhuma regra cadastrada ainda.
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
                    Câmera
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
                {rules.map((rule) => {
                  const camera =
                    rule.device_id != null
                      ? cameras.find((c) => c.id === rule.device_id)
                      : undefined;

                  return (
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
                        {rule.analytic_type}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {camera
                          ? (camera as any).code ||
                            camera.name ||
                            `CAM ${camera.id}`
                          : "Qualquer câmera"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default IncidentRulesPage;