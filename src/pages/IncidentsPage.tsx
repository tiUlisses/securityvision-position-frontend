// src/pages/IncidentsPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchIncidentMessages,
  createIncidentMessage,
  updateIncident,
  uploadIncidentAttachment,
} from "../api/incidents";
import type { Incident, IncidentMessage } from "../api/types";
import { API_BASE_URL, apiGet } from "../api/client";

// ------------------------------------------------------------
// Helpers / constants
// ------------------------------------------------------------

// Deriva a origin do backend a partir do API_BASE_URL
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

// Helper para resolver URLs de mídia (aceita full URL ou caminho relativo /media/…)
function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BACKEND_ORIGIN}${url}`;
  return `${BACKEND_ORIGIN}/${url.replace(/^\/+/, "")}`;
}

const STATUS_LABEL: Record<Incident["status"], string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em atendimento",
  RESOLVED: "Resolvido",
  FALSE_POSITIVE: "Falso positivo",
  CANCELED: "Cancelado",
};

const SEVERITY_LABEL: Record<Incident["severity"], string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const SEVERITY_COLOR: Record<Incident["severity"], string> = {
  LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  MEDIUM: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  HIGH: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  CRITICAL: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

const STATUS_COLOR: Record<Incident["status"], string> = {
  OPEN: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  IN_PROGRESS: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  FALSE_POSITIVE: "bg-slate-600/40 text-slate-100 border-slate-500/60",
  CANCELED: "bg-slate-700/60 text-slate-200 border-slate-600/60",
};

const TERMINAL_STATUSES: Incident["status"][] = ["RESOLVED", "FALSE_POSITIVE", "CANCELED"];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

function isOverdue(incident: Incident): boolean {
  if (!incident.due_at) return false;
  if (TERMINAL_STATUSES.includes(incident.status)) return false;
  const due = new Date(incident.due_at).getTime();
  const now = Date.now();
  return !Number.isNaN(due) && due < now;
}

// Merge robusto: evita duplicar, mantém ordenação asc pela data
function mergeMessages(prev: IncidentMessage[], incoming: IncidentMessage[]): IncidentMessage[] {
  if (!incoming || incoming.length === 0) return prev;

  const existingIds = new Set(prev.map((m) => m.id));
  const add = incoming.filter((m) => !existingIds.has(m.id));
  if (add.length === 0) return prev;

  const merged = [...prev, ...add];
  merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return merged;
}

// Interval que só roda com aba visível
function useIntervalWhenVisible(fn: () => void | Promise<void>, delayMs: number | null, deps: any[] = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (delayMs == null) return;

    let timer: number | null = null;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState !== "visible") return;
      await fnRef.current();
    };

    timer = window.setInterval(() => void tick(), delayMs);

    return () => {
      stopped = true;
      if (timer != null) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs, ...deps]);
}

// ------------------------------------------------------------
// UI subcomponents (mantém layout, melhora legibilidade)
// ------------------------------------------------------------

function Pill({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${className}`}>
      {children}
    </span>
  );
}

function IncidentListItem({
  incident,
  selected,
  onSelect,
}: {
  incident: Incident;
  selected: boolean;
  onSelect: () => void;
}) {
  const overdue = isOverdue(incident);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 flex flex-col gap-1 hover:bg-slate-900/80 ${
        selected ? "bg-slate-900/80" : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-100 font-medium truncate">{incident.title}</span>
            <span className="text-[10px] text-slate-500">#{incident.id}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Pill className={STATUS_COLOR[incident.status]}>{STATUS_LABEL[incident.status]}</Pill>
          <Pill className={SEVERITY_COLOR[incident.severity]}>{SEVERITY_LABEL[incident.severity]}</Pill>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
        <span>Dispositivo ID {incident.device_id}</span>
        {incident.device_event_id && (
          <>
            <span>•</span>
            <span>Evento #{incident.device_event_id}</span>
          </>
        )}
        {incident.kind && (
          <>
            <span>•</span>
            <span>{incident.kind}</span>
          </>
        )}
        {incident.tenant && (
          <>
            <span>•</span>
            <span>tenant: {incident.tenant}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>Criado: {formatDate(incident.created_at)}</span>
        {incident.due_at && (
          <span className={overdue ? "text-amber-300" : ""}>
            SLA: {formatDate(incident.due_at)}
            {overdue && " (vencido)"}
          </span>
        )}
      </div>
    </button>
  );
}

function MessageBubble({
  msg,
}: {
  msg: IncidentMessage;
}) {
  const isSystem = msg.message_type === "SYSTEM";
  const isMedia = msg.message_type === "MEDIA";
  const isRight = !isSystem;

  const bubbleBase = "max-w-[80%] rounded-2xl px-2.5 py-1.5 text-[11px] shadow-sm";
  const bubbleClasses = isSystem
    ? `${bubbleBase} bg-slate-800 text-slate-100`
    : `${bubbleBase} bg-sv-accent text-white`;

  const wrapperClasses = isSystem ? "flex flex-col items-center" : "flex flex-col items-end";

  const authorLabel =
    msg.author_name && msg.author_name.trim().length > 0
      ? msg.author_name
      : isSystem
      ? "Sistema"
      : "Operador";

  return (
    <div className={wrapperClasses}>
      <div className="mb-0.5 flex items-center gap-2 text-[10px] text-slate-500">
        {!isRight && <span>{authorLabel}</span>}
        <span>{formatTime(msg.created_at)}</span>
        {isRight && <span>{authorLabel}</span>}
      </div>

      <div className={bubbleClasses}>
        {isMedia && msg.media_url && (() => {
          const mediaUrl = resolveMediaUrl(msg.media_url);
          const thumbUrl = resolveMediaUrl(msg.media_thumb_url || msg.media_url);
          if (!mediaUrl) return null;

          return (
            <div className="mb-1">
              {msg.media_type === "IMAGE" && (
                <a href={mediaUrl} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={thumbUrl || mediaUrl}
                    alt={msg.media_name || "Mídia do incidente"}
                    className="max-h-40 rounded-md border border-slate-900/50 object-cover"
                  />
                </a>
              )}

              {msg.media_type === "VIDEO" && (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full max-h-48 rounded-md border border-slate-900/50"
                />
              )}

              {msg.media_type === "AUDIO" && (
                <audio src={mediaUrl} controls className="w-full" />
              )}

              {(!msg.media_type || !["IMAGE", "VIDEO", "AUDIO"].includes(msg.media_type)) && (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] underline"
                >
                  {msg.media_name || "Arquivo anexado"}
                </a>
              )}
            </div>
          );
        })()}

        {msg.content && (
          <p className={`whitespace-pre-wrap ${isSystem ? "text-slate-100 italic" : "text-white"}`}>
            {msg.content}
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [errorIncidents, setErrorIncidents] = useState<string | null>(null);

  const [onlyOpen, setOnlyOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | Incident["severity"]>("ALL");

  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const selectedIncidentIdRef = useRef<number | null>(null);

  const [messages, setMessages] = useState<IncidentMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [newMessageText, setNewMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Incident["status"] | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const lastMessageIdRef = useRef<number | null>(null);
  const [hasUnreadNewMessages, setHasUnreadNewMessages] = useState(false);

  // anti-race tokens
  const incidentsReqSeq = useRef(0);
  const messagesReqSeq = useRef(0);

  useEffect(() => {
    selectedIncidentIdRef.current = selectedIncidentId;
  }, [selectedIncidentId]);

  // ------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------
  const selectedIncident: Incident | null = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const severityMatch = severityFilter === "ALL" || inc.severity === severityFilter;
      if (!severityMatch) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        inc.title || "",
        inc.description || "",
        inc.kind || "",
        inc.tenant || "",
        String(inc.device_id),
        inc.status,
        String(inc.id),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [incidents, severityFilter, normalizedSearch]);

  const openCount = useMemo(
    () => filteredIncidents.filter((inc) => ["OPEN", "IN_PROGRESS"].includes(inc.status)).length,
    [filteredIncidents]
  );

  const overdueCount = useMemo(
    () => filteredIncidents.filter((inc) => isOverdue(inc)).length,
    [filteredIncidents]
  );

  const canStart = selectedIncident ? selectedIncident.status === "OPEN" : false;
  const canResolve = selectedIncident ? ["OPEN", "IN_PROGRESS"].includes(selectedIncident.status) : false;
  const canFalsePositive = canResolve;
  const canCancel = canResolve;
  const canReopen = selectedIncident ? TERMINAL_STATUSES.includes(selectedIncident.status) : false;

  // ------------------------------------------------------------
  // Load incidents (full load + silent refresh)
  // ------------------------------------------------------------
  const fetchMyIncidents = useCallback(async (silent: boolean) => {
    const reqId = ++incidentsReqSeq.current;

    try {
      if (!silent) {
        setLoadingIncidents(true);
        setErrorIncidents(null);
      }

      const qs = new URLSearchParams();
      if (onlyOpen) qs.append("only_open", "true");
      qs.append("limit", "200");

      const data = await apiGet<Incident[]>(`/incidents/my?${qs.toString()}`);

      // ordena desc
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // se chegou resposta antiga, ignora
      if (reqId !== incidentsReqSeq.current) return;

      setIncidents(data);

      setSelectedIncidentId((cur) => {
        if (cur && data.some((i) => i.id === cur)) return cur;
        return data[0]?.id ?? null;
      });
    } catch (err: any) {
      if (!silent) {
        console.error("Erro ao carregar incidentes:", err);
        setErrorIncidents(err?.message ?? "Erro ao carregar incidentes.");
      }
    } finally {
      if (!silent) setLoadingIncidents(false);
    }
  }, [onlyOpen]);

  useEffect(() => {
    void fetchMyIncidents(false);
  }, [fetchMyIncidents]);

  // refresh em background (status mudando sozinho etc.)
  useIntervalWhenVisible(
    async () => {
      await fetchMyIncidents(true);
    },
    6000,
    [onlyOpen]
  );

  // ------------------------------------------------------------
  // Load messages (initial + realtime refresh)
  // ------------------------------------------------------------
  const loadMessagesInitial = useCallback(async (incidentId: number) => {
    const reqId = ++messagesReqSeq.current;

    try {
      setLoadingMessages(true);
      setMessagesError(null);

      const data = await fetchIncidentMessages(incidentId, { limit: 300 });

      // ordena asc (timeline)
      data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (reqId !== messagesReqSeq.current) return;

      setMessages(data);
      lastMessageIdRef.current = data.length ? data[data.length - 1].id : null;
      setHasUnreadNewMessages(false);

      // scroll inicial pro final
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
    } catch (err: any) {
      console.error("Erro ao carregar mensagens:", err);
      if (reqId !== messagesReqSeq.current) return;
      setMessages([]);
      setMessagesError(err?.message ?? "Erro ao carregar mensagens do incidente.");
    } finally {
      if (reqId === messagesReqSeq.current) setLoadingMessages(false);
    }
  }, []);

  const refreshMessages = useCallback(async (incidentId: number) => {
    const reqId = ++messagesReqSeq.current;

    try {
      const afterId = lastMessageIdRef.current ?? undefined;

      const data = await fetchIncidentMessages(incidentId, {
        after_id: afterId,
        limit: 200,
      });

      if (reqId !== messagesReqSeq.current) return;
      if (!data || data.length === 0) return;

      // atualiza cursor (pega o maior id que veio)
      const newestId = data.reduce((max, m) => Math.max(max, m.id), lastMessageIdRef.current ?? 0);
      lastMessageIdRef.current = newestId;

      // decide se usuário está no fim antes de aplicar
      const el = timelineRef.current;
      const distToBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight : 0;
      const isAtBottom = distToBottom < 80;

      setMessages((prev) => mergeMessages(prev, data));

      if (!isAtBottom) {
        setHasUnreadNewMessages(true);
      } else {
        // se ele está no fim, mantém sempre no fim
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      }
    } catch {
      // silencioso (não “pisca” erro em tempo real)
    }
  }, []);

  // Ao trocar incidente selecionado: limpa estado e recarrega
  useEffect(() => {
    if (selectedIncidentId == null) {
      setMessages([]);
      setMessagesError(null);
      setLoadingMessages(false);
      lastMessageIdRef.current = null;
      setHasUnreadNewMessages(false);
      return;
    }

    lastMessageIdRef.current = null;
    setMessages([]);
    setHasUnreadNewMessages(false);
    void loadMessagesInitial(selectedIncidentId);
  }, [selectedIncidentId, loadMessagesInitial]);

  // realtime messages (chatwoot / outros usuários)
  useIntervalWhenVisible(
    async () => {
      const id = selectedIncidentIdRef.current;
      if (id == null) return;
      await refreshMessages(id);
    },
    1500,
    []
  );

  // Auto-scroll “inteligente” quando mensagens mudam (somente se já estava no fim)
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = dist < 80;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ------------------------------------------------------------
  // Actions: send message / attach
  // ------------------------------------------------------------
  const handleSendMessage = useCallback(async () => {
    if (!selectedIncident) return;
    const text = newMessageText.trim();
    if (!text) return;

    try {
      setSending(true);
      const msg = await createIncidentMessage(selectedIncident.id, text);

      setMessages((prev) => mergeMessages(prev, [msg]));
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current ?? 0, msg.id);
      setNewMessageText("");

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      console.error("Erro ao registrar mensagem:", err);
      alert("Erro ao registrar mensagem na timeline. Veja o console.");
    } finally {
      setSending(false);
    }
  }, [selectedIncident, newMessageText]);

  const handleKeyDownTextarea = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sending) void handleSendMessage();
      }
    },
    [handleSendMessage, sending]
  );

  const handleClickAttach = useCallback(() => {
    if (!selectedIncident) return;
    fileInputRef.current?.click();
  }, [selectedIncident]);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedIncident) {
        e.target.value = "";
        return;
      }

      try {
        setUploading(true);
        const desc = newMessageText.trim() || undefined;

        const msg = await uploadIncidentAttachment(selectedIncident.id, file, desc);

        setMessages((prev) => mergeMessages(prev, [msg]));
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current ?? 0, msg.id);
        setNewMessageText("");

        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      } catch (err) {
        console.error("Erro ao anexar arquivo:", err);
        alert("Erro ao anexar arquivo no incidente. Veja o console para mais detalhes.");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [selectedIncident, newMessageText]
  );

  // ------------------------------------------------------------
  // Actions: status changes
  // ------------------------------------------------------------
  const handleChangeStatus = useCallback(
    async (status: Incident["status"]) => {
      if (!selectedIncident) return;

      try {
        setStatusUpdating(status);

        const updated = await updateIncident(selectedIncident.id, { status });

        setIncidents((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)));
        setSelectedIncidentId(updated.id);

        // puxa mensagens imediatamente (system message) + reduz latência
        await refreshMessages(updated.id);
      } catch (err) {
        console.error("Erro ao atualizar status do incidente:", err);
        alert("Erro ao atualizar status do incidente. Veja o console.");
      } finally {
        setStatusUpdating(null);
      }
    },
    [selectedIncident, refreshMessages]
  );

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Incidentes de câmeras</h1>
          <p className="text-sm text-slate-400">
            Gerencie ocorrências geradas a partir dos eventos das câmeras, acompanhe o fluxo de atendimento e registre
            tudo na timeline. Esta lista mostra apenas incidentes atribuídos a você ou aos grupos de atendimento dos
            quais você faz parte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchMyIncidents(false)}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
          >
            Recarregar
          </button>
        </div>
      </header>

      {/* Filtros + resumos */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            placeholder="Buscar por título, descrição, dispositivo, tenant..."
            className="w-full sm:w-80 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <label className="inline-flex items-center gap-2 text-slate-300 mt-1 sm:mt-0">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
            />
            <span>Mostrar apenas incidentes em aberto</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1">
            {(["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((sev) => {
              const label = sev === "ALL" ? "Todos" : SEVERITY_LABEL[sev];
              const active = severityFilter === sev;
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2 py-0.5 rounded-full text-[11px] border ${
                    active
                      ? "border-sv-accent bg-sv-accent/20 text-sv-accent"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 text-[11px]">
            <div className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              <span className="text-slate-400 mr-1">Incidentes:</span>
              <span className="font-semibold">{filteredIncidents.length}</span>
            </div>

            <div className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              <span className="text-slate-400 mr-1">Em aberto:</span>
              <span className="font-semibold">{openCount}</span>
            </div>

            <div className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              <span className="text-slate-400 mr-1">Vencidos:</span>
              <span className="font-semibold text-amber-300">{overdueCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Painel principal: lista + detalhes/chat */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] gap-3">
        {/* Lista de incidentes */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 text-xs flex flex-col min-h-[420px] max-h-[640px]">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <span className="font-semibold text-slate-200">Incidentes ({filteredIncidents.length})</span>
            {loadingIncidents && <span className="text-[11px] text-slate-400">Carregando...</span>}
          </div>

          {errorIncidents && (
            <div className="px-3 py-2 text-[11px] text-rose-400 border-b border-slate-800">{errorIncidents}</div>
          )}

          {!loadingIncidents && filteredIncidents.length === 0 && (
            <div className="px-3 py-4 text-[11px] text-slate-500">
              Nenhum incidente encontrado com os filtros atuais.
            </div>
          )}

          {filteredIncidents.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800">
              {filteredIncidents.map((inc) => (
                <IncidentListItem
                  key={inc.id}
                  incident={inc}
                  selected={inc.id === selectedIncidentId}
                  onSelect={() => {
                    setSelectedIncidentId(inc.id);
                    setNewMessageText("");
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detalhes + chat */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 text-xs flex flex-col min-h-[420px] max-h-[640px]">
          {!selectedIncident ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm text-slate-400">
                Selecione um incidente à esquerda para ver os detalhes e a timeline.
              </p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do incidente */}
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-semibold truncate">{selectedIncident.title}</span>
                      <span className="text-[10px] text-slate-500">#{selectedIncident.id}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                      {selectedIncident.description || "Sem descrição detalhada."}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Pill className={STATUS_COLOR[selectedIncident.status]}>{STATUS_LABEL[selectedIncident.status]}</Pill>
                    <Pill className={SEVERITY_COLOR[selectedIncident.severity]}>
                      {SEVERITY_LABEL[selectedIncident.severity]}
                    </Pill>
                  </div>
                </div>

                {/* Info rápida */}
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-slate-300">
                  <div>
                    <span className="block text-slate-400 text-[10px]">Tipo</span>
                    <span>{selectedIncident.kind || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">Dispositivo</span>
                    <span>ID {selectedIncident.device_id}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">Evento</span>
                    <span>{selectedIncident.device_event_id ?? "—"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">Tenant</span>
                    <span>{selectedIncident.tenant || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">SLA (min)</span>
                    <span>{selectedIncident.sla_minutes ?? "—"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">Vencimento</span>
                    <span className={isOverdue(selectedIncident) ? "text-amber-300" : ""}>
                      {formatDate(selectedIncident.due_at)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">Criado em</span>
                    <span>{formatDate(selectedIncident.created_at)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px]">Fechado em</span>
                    <span>{formatDate(selectedIncident.closed_at)}</span>
                  </div>
                </div>

                {/* Ações de status */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canStart || !!statusUpdating}
                    onClick={() => void handleChangeStatus("IN_PROGRESS")}
                    className="px-3 py-1 rounded bg-amber-500/20 text-[11px] text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-default"
                  >
                    {statusUpdating === "IN_PROGRESS" ? "Atualizando..." : "Iniciar atendimento"}
                  </button>

                  <button
                    type="button"
                    disabled={!canResolve || !!statusUpdating}
                    onClick={() => void handleChangeStatus("RESOLVED")}
                    className="px-3 py-1 rounded bg-emerald-500/20 text-[11px] text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-default"
                  >
                    {statusUpdating === "RESOLVED" ? "Atualizando..." : "Marcar como resolvido"}
                  </button>

                  <button
                    type="button"
                    disabled={!canFalsePositive || !!statusUpdating}
                    onClick={() => void handleChangeStatus("FALSE_POSITIVE")}
                    className="px-3 py-1 rounded bg-slate-600/40 text-[11px] text-slate-100 hover:bg-slate-500/60 disabled:opacity-50 disabled:cursor-default"
                  >
                    {statusUpdating === "FALSE_POSITIVE" ? "Atualizando..." : "Falso positivo"}
                  </button>

                  <button
                    type="button"
                    disabled={!canCancel || !!statusUpdating}
                    onClick={() => void handleChangeStatus("CANCELED")}
                    className="px-3 py-1 rounded bg-slate-700/60 text-[11px] text-slate-100 hover:bg-slate-600/70 disabled:opacity-50 disabled:cursor-default"
                  >
                    {statusUpdating === "CANCELED" ? "Atualizando..." : "Cancelar"}
                  </button>

                  <button
                    type="button"
                    disabled={!canReopen || !!statusUpdating}
                    onClick={() => void handleChangeStatus("OPEN")}
                    className="px-3 py-1 rounded bg-sv-accent/20 text-[11px] text-sv-accent hover:bg-sv-accent/30 disabled:opacity-50 disabled:cursor-default"
                  >
                    {statusUpdating === "OPEN" ? "Atualizando..." : "Reabrir"}
                  </button>
                </div>
              </div>

              {/* Timeline + input */}
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Lista de mensagens */}
                <div
                  ref={timelineRef}
                  className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2"
                  onScroll={() => {
                    const el = timelineRef.current;
                    if (!el) return;
                    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
                    if (dist < 80) setHasUnreadNewMessages(false);
                  }}
                >
                  {loadingMessages && (
                    <div className="text-[11px] text-slate-400">Carregando timeline...</div>
                  )}

                  {messagesError && !loadingMessages && (
                    <div className="text-[11px] text-rose-400">{messagesError}</div>
                  )}

                  {!loadingMessages && !messagesError && messages.length === 0 && (
                    <div className="text-[11px] text-slate-500">
                      Nenhum registro na timeline ainda. Use o campo abaixo para registrar as ações.
                    </div>
                  )}

                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}

                  {hasUnreadNewMessages && (
                    <div className="sticky bottom-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setHasUnreadNewMessages(false);
                          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="rounded-full bg-sv-accent px-3 py-1 text-[11px] text-white shadow hover:bg-sv-accentSoft"
                      >
                        Novas mensagens • Ir para o final
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input mensagem + anexar */}
                <div className="border-t border-slate-800 px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <textarea
                      rows={2}
                      placeholder="Descreva a ação tomada, observação ou comentário e pressione Enter para enviar (Shift+Enter para nova linha)..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 resize-none"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyDown={handleKeyDownTextarea}
                      disabled={sending || uploading}
                    />

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClickAttach}
                          disabled={uploading}
                          className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-100 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-default"
                        >
                          {uploading ? "Enviando..." : "Anexar arquivo"}
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileSelected}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSendMessage()}
                        disabled={!newMessageText.trim() || sending || uploading}
                        className="px-3 py-1 rounded bg-sv-accent text-[11px] text-white hover:bg-sv-accentSoft disabled:opacity-60 disabled:cursor-default"
                      >
                        {sending ? "Enviando..." : "Registrar na timeline"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
