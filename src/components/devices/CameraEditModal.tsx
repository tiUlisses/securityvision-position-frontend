import React, { useEffect, useState } from "react";
import Modal from "../common/Modal";
import { apiPut } from "../../api/client";
import { CameraAnalyticsSelector } from "./CameraAnalyticsSelector";
import { DEFAULT_ANALYTICS_BY_MANUFACTURER } from "../../constants/analytics";

interface Device {
  id: number;
  name: string;
  code?: string | null;
  building_id?: number | null;
  floor_id?: number | null;
  ip_address?: string | null;
  port?: number | null;
  rtsp_url?: string | null;
  central_host?: string | null;
  username?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  analytics?: string[] | null;
}

interface Props {
  camera: Device;
  onClose: () => void;
  onUpdated: (updated: Device) => void;
}

const CameraEditModal: React.FC<Props> = ({ camera, onClose, onUpdated }) => {
  const [name, setName] = useState(camera.name || "");
  const [code, setCode] = useState(camera.code || "");
  const [ip, setIp] = useState(camera.ip_address || "");
  const [port, setPort] = useState((camera.port ?? 80).toString());
  const [rtspUrl, setRtspUrl] = useState(camera.rtsp_url || "");
  const [centralHost, setCentralHost] = useState(camera.central_host || "");
  const [username, setUsername] = useState(camera.username || "admin");
  const [password, setPassword] = useState(""); // senha nunca vem do backend
  const [manufacturer, setManufacturer] = useState(camera.manufacturer || "Dahua");
  const [model, setModel] = useState(camera.model || "any");
  const [analytics, setAnalytics] = useState<string[]>(camera.analytics || []);

  useEffect(() => {
    // Se o fabricante mudar, atualiza analytics default (somente se estiver vazio)
    const key = manufacturer.toLowerCase();
    const defaults = DEFAULT_ANALYTICS_BY_MANUFACTURER[key];
    if (defaults && analytics.length === 0) {
      setAnalytics(defaults);
    }
  }, [manufacturer]);

  const handleSave = async () => {
    const payload: any = {
      name,
      code,
      ip_address: ip.trim(),
      port: Number(port),
      rtsp_url: rtspUrl.trim(),
      central_host: centralHost.trim(),
      username: username.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      analytics,
      // só incluímos password se o usuário digitou algo
      ...(password ? { password } : {}),
    };

    try {
      const updated = await apiPut<Device>(
        `/devices/cameras/${camera.id}`,
        payload
      );

      onUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar câmera:", err);
      alert("Erro ao atualizar câmera. Verifique o console.");
    }
  };

  return (
    <Modal
      isOpen={true}
      title={`Editar câmera: ${camera.name}`}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Código"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="IP"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />

        <input
          type="number"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Porta"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="RTSP URL"
          value={rtspUrl}
          onChange={(e) => setRtspUrl(e.target.value)}
        />

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Host central (MTX)"
          value={centralHost}
          onChange={(e) => setCentralHost(e.target.value)}
        />

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Nova senha (opcional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
        >
          <option value="Dahua">Dahua</option>
          <option value="Hikvision">Hikvision</option>
        </select>

        <input
          type="text"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          placeholder="Modelo"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        {/* Analytics selector ocupa linha inteira */}
        <div className="md:col-span-2">
          <CameraAnalyticsSelector
            manufacturer={manufacturer}
            value={analytics}
            onChange={setAnalytics}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-slate-700 rounded text-slate-100 hover:bg-slate-600"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-sm bg-sv-accent text-white rounded hover:bg-sv-accentSoft"
        >
          Salvar alterações
        </button>
      </div>
    </Modal>
  );
};

export default CameraEditModal;
