// Exemplo: src/components/events/EventDetailsModal.tsx
import React, { useState } from "react";
import type { DeviceEvent } from "../../api/deviceEvent";
import { createIncidentFromDeviceEvent } from "../../api/incidents";

interface Props {
  event: DeviceEvent | null;
  open: boolean;
  onClose: () => void;
}

const EventDetailsModal: React.FC<Props> = ({ event, open, onClose }) => {
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSeverity, setIncidentSeverity] =
    useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  if (!open || !event) return null;

  async function handleCreateIncident() {
    try {
      setCreatingIncident(true);
  
      const title =
        incidentTitle.trim() ||
        `Incidente - ${event.analytic_type} - ${event.topic}`;
  
      await createIncidentFromDeviceEvent({
        deviceEventId: event.id,
        title,
        description: incidentDescription || undefined,
        severity: incidentSeverity,
      });
  
      onClose();
    } catch (err) {
      console.error(err);
      // exibir toast se quiser
    } finally {
      setCreatingIncident(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {/* ... aqui ficam os dados do evento ... */}

        <hr />

        <h3>Criar incidente a partir deste evento</h3>

        <div className="field">
          <label>Título do incidente</label>
          <input
            type="text"
            value={incidentTitle}
            onChange={(e) => setIncidentTitle(e.target.value)}
            placeholder="Ex.: Câmera offline no Prédio A"
          />
        </div>

        <div className="field">
          <label>Severidade</label>
          <select
            value={incidentSeverity}
            onChange={(e) =>
              setIncidentSeverity(e.target.value as any)
            }
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea
            rows={3}
            value={incidentDescription}
            onChange={(e) => setIncidentDescription(e.target.value)}
            placeholder="Contextualize o problema, ação tomada, etc."
          />
        </div>

        <div className="actions">
          <button onClick={onClose} disabled={creatingIncident}>
            Fechar
          </button>
          <button onClick={handleCreateIncident} disabled={creatingIncident}>
            {creatingIncident ? "Criando..." : "Criar incidente"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
