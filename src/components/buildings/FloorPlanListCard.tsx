import React from "react";
import ManagementCard from "./ManagementCard";
import type { FloorPlan } from "../../pages/BuildingsAndFloorsPage";

interface FloorPlanListCardProps {
  floorPlans: FloorPlan[];
  onCreate: () => void;
  onEdit: (floorPlan: FloorPlan) => void;
  onUploadImage: (floorPlanId: number) => void;
  onSetImageUrl: (floorPlan: FloorPlan) => void;
  disabled?: boolean;
}

const FloorPlanListCard: React.FC<FloorPlanListCardProps> = ({
  floorPlans,
  onCreate,
  onEdit,
  onUploadImage,
  onSetImageUrl,
  disabled = false,
}) => {
  return (
    <ManagementCard
      title="Plantas e posicionamento"
      description="Crie plantas para posicionar gateways e câmeras em cada andar."
      actions={
        <button
          type="button"
          onClick={onCreate}
          disabled={disabled}
          className="text-xs px-3 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Criar planta
        </button>
      }
    >
      {disabled ? (
        <p className="text-xs text-slate-500">
          Selecione um andar para habilitar a criação e edição de plantas.
        </p>
      ) : null}

      <div className="space-y-2">
        {floorPlans.length === 0 ? (
          <div className="text-xs text-slate-500">
            Nenhuma planta cadastrada para este andar.
          </div>
        ) : (
          floorPlans.map((fp) => (
            <div
              key={fp.id}
              className="flex items-center justify-between bg-slate-950 rounded px-3 py-2 text-sm border border-slate-800"
            >
              <div>
                <div className="text-slate-100">
                  {fp.name} (ID {fp.id})
                </div>
                <div className="text-[11px] text-slate-500">
                  {fp.image_url
                    ? "Imagem configurada"
                    : "Sem imagem definida"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSetImageUrl(fp)}
                  className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  Definir URL
                </button>
                <button
                  type="button"
                  onClick={() => onUploadImage(fp.id)}
                  className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  Upload imagem
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(fp)}
                  className="text-[11px] px-2 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
                >
                  Editar planta
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </ManagementCard>
  );
};

export default FloorPlanListCard;
