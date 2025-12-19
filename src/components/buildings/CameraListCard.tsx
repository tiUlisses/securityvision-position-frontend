import React from "react";
import type { Device } from "../../pages/BuildingsAndFloorsPage";

interface CameraListCardProps {
  cameras: Device[];
  onEdit: (camera: Device) => void;
  onDelete: (cameraId: number) => void;
}

const CameraListCard: React.FC<CameraListCardProps> = ({
  cameras,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden text-xs bg-slate-950/80">
      {cameras.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-slate-500">
          Nenhuma câmera cadastrada para este andar.
        </div>
      ) : (
        cameras.map((cam) => (
          <div
            key={cam.id}
            className="px-3 py-2 border-b border-slate-800 last:border-b-0 flex items-center justify-between"
          >
            <div>
              <div className="text-slate-100 font-medium">{cam.name}</div>
              <div className="text-[11px] text-slate-500">
                Código: {cam.code ?? "—"} · IP: {cam.ip_address ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Planta:{" "}
                {cam.floor_plan_id
                  ? `ID ${cam.floor_plan_id}`
                  : "não posicionado na planta"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(cam)}
                className="text-[11px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(cam.id)}
                className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
              >
                Excluir
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CameraListCard;
