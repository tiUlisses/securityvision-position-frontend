import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import { startCameraStream, stopCameraStream } from "../../api/client";
import type { Device, DeviceEventDTO } from "../../api/types";

function isStatusEvent(evt: DeviceEventDTO): boolean {
  const analytic = (evt.analytic_type || "").toLowerCase();
  const topic = (evt.topic || "").toLowerCase();
  const isStatusTopic = topic.endsWith("/status") || topic.includes("/status/");
  const isStatusAnalytic = analytic === "cambus_status" || analytic === "status";
  return isStatusTopic || isStatusAnalytic;
}

type Props = {
  isOpen: boolean;
  camera: Device;
  events: DeviceEventDTO[];
  onClose: () => void;
  onRequestCreateIncident: (evt: DeviceEventDTO) => void;
  creatingIncident?: boolean;
};

export default function CameraStreamModal({
  isOpen,
  camera,
  events,
  onClose,
  onRequestCreateIncident,
  creatingIncident,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(events[0]?.id ?? null);
  }, [isOpen, events]);

  useEffect(() => {
    if (!isOpen) return;
    void startCameraStream(camera.id);

    return () => {
      void stopCameraStream(camera.id);
    };
  }, [isOpen, camera.id]);

  const selectedEvent = useMemo(() => {
    if (!events.length) return null;
    if (!selectedId) return events[0];
    return events.find((e) => e.id === selectedId) || events[0];
  }, [events, selectedId]);

  const payload = (selectedEvent?.payload || {}) as any;
  const meta = payload.Meta || {};

  const analytic: string =
    payload.AnalyticType || selectedEvent?.analytic_type || "";

  const analyticLower = analytic.toLowerCase();
  const isFaceRecognized =
    analyticLower === "facerecognized" ||
    analyticLower === "face_recognized" ||
    analyticLower === "face recognized";

  const tsRaw: string | null =
    payload.Timestamp ||
    payload.timestamp ||
    selectedEvent?.occurred_at ||
    selectedEvent?.created_at ||
    null;

  const tsLabel = useMemo(() => {
    if (!tsRaw) return "";
    const d = new Date(tsRaw);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, [tsRaw]);

  const snapshotUrl: string | undefined =
    payload.SnapshotURL || payload.snapshotUrl || payload.snapshot_url;

  const ffPhotoUrl: string | undefined = meta.ff_person_photo_url;
  const ffName: string | undefined = meta.ff_person_name || meta.person_name;
  const ffConfidence: number | undefined =
    typeof meta.ff_confidence === "number" ? meta.ff_confidence : undefined;

  const infoItems = useMemo(() => {
    if (!selectedEvent) return [];

    const boolToLabel = (v: any) => {
      if (typeof v === "boolean") return v ? "Sim" : "Não";
      if (typeof v === "number") {
        if (v === 1) return "Sim";
        if (v === 0) return "Não";
        return String(v);
      }
      return v != null ? String(v) : "";
    };

    const m = meta || {};
    const obj = m.Object || {};

    const items: { label: string; value: string | number }[] = [];
    const push = (label: string, value: any) => {
      if (value === undefined || value === null || value === "") return;
      items.push({ label, value });
    };

    push("Câmera", payload.CameraName || (camera as any).code || camera.name);
    push("IP da câmera", payload.CameraIP || (camera as any).ip_address);
    push("Prédio", payload.Building);
    push("Andar / setor", payload.Floor);
    push("Tipo de analítico", payload.AnalyticType || selectedEvent.analytic_type);
    push("Ação", m.action || m.eventDescription || m.eventType);
    push("Idade estimada", obj.Age ?? m.Age);
    push("Sexo", obj.Sex ?? m.Sex);
    push("Emoção", obj.Emotion ?? m.Emotion);
    push("Máscara", boolToLabel(obj.Mask ?? m.Mask));
    push("Óculos", boolToLabel(obj.Glass ?? m.Glass));
    push("Faces no quadro", m.facesCount ?? (Array.isArray(m.Faces) ? m.Faces.length : undefined));

    return items;
  }, [selectedEvent, meta, payload, camera]);

  const uiEvents = useMemo(() => {
    return (events || []).filter((evt) => {
      const topicLower = (evt.topic || "").toLowerCase();
      if (!topicLower.endsWith("/events")) return false;
      if (isStatusEvent(evt)) return false;
      return true;
    });
  }, [events]);

  const streamUrl = useMemo(() => {
    const centralHost = camera.central_host?.trim() || "";
    const centralPath = camera.central_path?.trim() || "";

    if (!centralHost || !centralPath) return null;

    const normalizedHost = centralHost
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
    const normalizedPath = centralPath.replace(/^\/+|\/+$/g, "");

    return `https://${normalizedHost}/${normalizedPath}/`;
  }, [camera.central_host, camera.central_path]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      title={`Eventos da câmera: ${(camera as any).code || camera.name || `#${camera.id}`}`}
      onClose={onClose}
      maxWidthClass="max-w-[96vw] md:max-w-6xl"
    >
      <div className="max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Lista */}
          <div className="md:w-1/4 border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100">
              Eventos recentes
            </div>
            <div className="max-h-[70vh] overflow-y-auto bg-slate-950 text-xs">
              {uiEvents.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-slate-400">
                  Nenhum evento analítico registrado para esta câmera.
                </div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {uiEvents.map((evt) => {
                    const p = (evt.payload || {}) as any;
                    const a = p.AnalyticType || evt.analytic_type || "—";
                    const raw = p.Timestamp || p.timestamp || evt.occurred_at || evt.created_at;
                    const label = raw ? new Date(raw).toLocaleString() : "";
                    const isSelected = selectedId === evt.id;

                    return (
                      <li
                        key={evt.id}
                        className={`cursor-pointer px-3 py-2 ${isSelected ? "bg-slate-800" : "hover:bg-slate-900/70"}`}
                        onClick={() => setSelectedId(evt.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-100 truncate">
                            {a}
                          </span>
                          {label && (
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {label}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500 truncate">
                          {p.Meta?.eventDescription || p.Meta?.action || evt.topic}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Preview + detalhes */}
          <div className="md:w-3/4 border border-slate-800 rounded-lg bg-slate-950 text-xs flex flex-col">
            <div className="border-b border-slate-800 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-slate-100 uppercase tracking-wide">
                    {analytic || "Preview da câmera"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {tsLabel || "Sem timestamp"}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isFaceRecognized
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-sky-500/20 text-sky-300"
                  }`}
                >
                  {isFaceRecognized ? "Reconhecimento facial" : "Analítico de câmera"}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-3 py-3">
              <div className="rounded-lg border border-slate-800 bg-black/50 p-2">
                {streamUrl ? (
                  <iframe
                    title="Stream da câmera"
                    src={streamUrl}
                    className="h-[360px] w-full rounded-md border border-slate-800 bg-black"
                    allow="autoplay; fullscreen"
                  />
                ) : (
                  <div className="flex h-[360px] items-center justify-center rounded-md border border-dashed border-slate-700 text-[11px] text-slate-400">
                    Stream indisponível. Configure o host e o caminho do central para habilitar o
                    preview.
                  </div>
                )}
                {streamUrl && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    URL do stream: <span className="break-all text-slate-300">{streamUrl}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400 pr-2">
                  Deseja abrir um incidente a partir deste evento?
                </p>
                <button
                  type="button"
                  onClick={() => selectedEvent && onRequestCreateIncident(selectedEvent)}
                  disabled={!selectedEvent || creatingIncident}
                  className="rounded-md bg-sv-accent px-3 py-1 text-[11px] font-medium text-white hover:bg-sv-accentSoft disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creatingIncident ? "Preparando..." : "Criar incidente"}
                </button>
              </div>

              {(snapshotUrl || (isFaceRecognized && ffPhotoUrl)) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {snapshotUrl && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold text-slate-400">
                        Snapshot do evento
                      </div>
                      <div className="overflow-hidden rounded-md border border-slate-800 bg-black/40">
                        <img
                          src={snapshotUrl}
                          alt="Snapshot do evento"
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {isFaceRecognized && ffPhotoUrl && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold text-slate-400">
                        Face cadastrada
                      </div>
                      <div className="overflow-hidden rounded-md border border-slate-800 bg-black/40">
                        <img
                          src={ffPhotoUrl}
                          alt="Foto cadastrada"
                          className="h-auto w-full object-cover"
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-slate-300 space-y-0.5">
                        {ffName && <div>ID pessoa: {ffName}</div>}
                        {typeof ffConfidence === "number" && (
                          <div>Confiança: {(ffConfidence * 100).toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {infoItems.length > 0 && (
                <div className="grid grid-cols-1 gap-y-1 gap-x-3 sm:grid-cols-2 text-[11px]">
                  {infoItems.map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {meta && Object.keys(meta).length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
                    Meta (JSON bruto)
                  </div>
                  <div className="max-h-44 overflow-auto rounded-md bg-slate-950 border border-slate-800 p-2 text-[10px] font-mono text-slate-300">
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(meta, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
