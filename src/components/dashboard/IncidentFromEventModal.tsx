import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import type { Device, DeviceEventDTO, Incident, IncidentSeverity } from "../../api/types";
import type { SupportGroupEntity } from "../../api/supportGroups";
import { createIncidentFromEvent } from "../../api/incidents";

type Props = {
  isOpen: boolean;
  event: DeviceEventDTO;
  camera: Device | null;
  supportGroups: SupportGroupEntity[];
  currentUserId?: number;

  onClose: () => void;
  onCreated?: (incident: Incident) => void;
};

function buildDefaults(evt: DeviceEventDTO, camera: Device | null) {
  const payload = (evt.payload || {}) as any;
  const analytic = (payload.AnalyticType as string) || evt.analytic_type || "Evento de câmera";
  const cameraName =
    (camera as any)?.code || camera?.name || `Câmera #${evt.device_id}`;

  const raw =
    payload.Timestamp || payload.timestamp || evt.occurred_at || evt.created_at;

  let tsLabel = "";
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) tsLabel = d.toLocaleString();
  }

  const title = `[${analytic}] - ${cameraName}`;
  const description = tsLabel
    ? `Incidente criado a partir do evento "${analytic}" da câmera ${cameraName} em ${tsLabel}.`
    : `Incidente criado a partir do evento "${analytic}" da câmera ${cameraName}.`;

  return { title, description };
}

export default function IncidentFromEventModal({
  isOpen,
  event,
  camera,
  supportGroups,
  currentUserId,
  onClose,
  onCreated,
}: Props) {
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedGroupId, setAssignedGroupId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeGroups = useMemo(
    () => (supportGroups || []).filter((g) => g.is_active),
    [supportGroups]
  );

  useEffect(() => {
    if (!isOpen) return;

    const defs = buildDefaults(event, camera);
    setTitle(defs.title);
    setDescription(defs.description);
    setSeverity("MEDIUM");
    setError(null);

    // default group: 1) grupo onde o user é membro, 2) primeiro grupo ativo
    const byMember =
      currentUserId != null
        ? activeGroups.find((g) => (g.members || []).some((m) => m.id === currentUserId))
        : undefined;

    setAssignedGroupId(byMember?.id ?? activeGroups[0]?.id ?? "");
  }, [isOpen, event, camera, currentUserId, activeGroups]);

  const selectedGroup = useMemo(() => {
    if (!assignedGroupId) return null;
    return activeGroups.find((g) => g.id === Number(assignedGroupId)) || null;
  }, [assignedGroupId, activeGroups]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const incident = await createIncidentFromEvent({
        device_event_id: event.id,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        severity,

        assigned_group_id: assignedGroupId ? Number(assignedGroupId) : undefined,
        sla_minutes: selectedGroup?.default_sla_minutes ?? undefined,
      });

      onCreated?.(incident);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Falha ao criar incidente. Verifique e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      title="Criar incidente a partir deste evento"
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
            {error}
          </div>
        )}

        <p className="text-[11px] text-slate-300">
          O incidente será criado em status{" "}
          <span className="font-semibold text-emerald-300">ABERTO</span>{" "}
          vinculado automaticamente à câmera e ao evento selecionado.
        </p>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-200">
            Grupo de atendimento
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50"
            value={assignedGroupId}
            onChange={(e) => setAssignedGroupId(e.target.value ? Number(e.target.value) : "")}
            disabled={activeGroups.length === 0}
          >
            {activeGroups.length === 0 && (
              <option value="">Nenhum grupo ativo cadastrado</option>
            )}
            {activeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {selectedGroup?.default_sla_minutes != null && (
            <div className="mt-1 text-[10px] text-slate-400">
              SLA padrão do grupo:{" "}
              <span className="text-slate-200 font-semibold">
                {selectedGroup.default_sla_minutes} min
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-200">
            Severidade
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-200">
            Título do incidente
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-200">
            Descrição
          </label>
          <textarea
            rows={4}
            className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-sv-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sv-accentSoft disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting || !title.trim()}
          >
            {submitting ? "Criando incidente..." : "Criar incidente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
