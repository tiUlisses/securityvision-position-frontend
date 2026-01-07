import React from "react";
import { CameraAnalyticsSelector } from "../devices/CameraAnalyticsSelector";

export type CameraField =
  | "name"
  | "code"
  | "ip"
  | "port"
  | "rtspUrl"
  | "centralHost"
  | "username"
  | "password"
  | "model";

interface CameraQuickFormProps {
  values: {
    name: string;
    code: string;
    ip: string;
    port: string;
    rtspUrl: string;
    centralHost: string;
    username: string;
    password: string;
    manufacturer: string;
    model: string;
    analytics: string[];
  };
  onFieldChange: (field: CameraField, value: string) => void;
  onManufacturerChange: (value: string) => void;
  onAnalyticsChange: (analytics: string[]) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const Field: React.FC<{
  children: React.ReactNode;
  label: string;
  helper?: string;
}> = ({ children, label, helper }) => (
  <label className="flex flex-col gap-1 text-xs text-slate-300">
    <span className="font-semibold">{label}</span>
    {children}
    {helper ? <span className="text-[11px] text-slate-500">{helper}</span> : null}
  </label>
);

const inputClass =
  "bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:border-sv-accent/60";

const CameraQuickForm: React.FC<CameraQuickFormProps> = ({
  values,
  onFieldChange,
  onManufacturerChange,
  onAnalyticsChange,
  onSubmit,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Cadastre rapidamente uma câmera para o andar selecionado. Os campos
        ficam habilitados apenas após selecionar prédio e andar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <Field label="Nome" helper="Ex.: Câmera fixa 01">
          <input
            type="text"
            value={values.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </Field>
        <Field label="Código">
          <input
            type="text"
            value={values.code}
            onChange={(e) => onFieldChange("code", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="Ex.: FIXA01"
          />
        </Field>
        <Field label="IP">
          <input
            type="text"
            value={values.ip}
            onChange={(e) => onFieldChange("ip", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="192.168.0.10"
          />
        </Field>
        <Field label="Porta">
          <input
            type="number"
            value={values.port}
            onChange={(e) => onFieldChange("port", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="80"
          />
        </Field>
        <Field label="RTSP URL">
          <input
            type="text"
            value={values.rtspUrl}
            onChange={(e) => onFieldChange("rtspUrl", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="rtsp://usuario:senha@host/stream"
          />
        </Field>
        <Field label="Host central (MTX)">
          <input
            type="text"
            value={values.centralHost}
            onChange={(e) => onFieldChange("centralHost", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="mtx.local"
          />
        </Field>
        <Field label="Usuário">
          <input
            type="text"
            value={values.username}
            onChange={(e) => onFieldChange("username", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="admin"
          />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            value={values.password}
            onChange={(e) => onFieldChange("password", e.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </Field>

        <Field
          label="Fabricante"
          helper="Atualiza a lista de analíticos disponíveis."
        >
          <select
            value={values.manufacturer}
            onChange={(e) => onManufacturerChange(e.target.value)}
            className={inputClass}
            disabled={disabled}
          >
            <option value="">Selecione o fabricante</option>
            <option value="Dahua">Dahua</option>
            <option value="Hikvision">Hikvision</option>
          </select>
        </Field>

        <Field label="Modelo">
          <input
            type="text"
            value={values.model}
            onChange={(e) => onFieldChange("model", e.target.value)}
            className={inputClass}
            disabled={disabled}
            placeholder="any"
          />
        </Field>

        <div className="md:col-span-2 lg:col-span-3">
          <CameraAnalyticsSelector
            manufacturer={values.manufacturer}
            value={values.analytics}
            onChange={onAnalyticsChange}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="text-xs px-4 py-2 rounded bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Adicionar câmera
        </button>
      </div>
    </div>
  );
};

export default CameraQuickForm;
