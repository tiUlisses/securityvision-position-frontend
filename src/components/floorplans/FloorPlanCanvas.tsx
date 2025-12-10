// src/components/floorplans/FloorPlanCanvas.tsx
import React from "react";
import Draggable from "react-draggable";

export interface FloorPlanGateway {
  id: number;
  name: string;
  pos_x: number | null;
  pos_y: number | null;
}

interface FloorPlanCanvasProps {
  imageUrl: string;
  gateways: FloorPlanGateway[];
  onGatewayPositionChange: (id: number, x: number, y: number) => void;
}

const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  imageUrl,
  gateways,
  onGatewayPositionChange,
}) => {
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
      <div className="relative w-full max-h-[600px] overflow-auto">
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Planta baixa"
            className="max-w-full h-auto block"
          />

          {gateways.map((gw) => {
            const defaultX = gw.pos_x ?? 40;
            const defaultY = gw.pos_y ?? 40;

            return (
              <Draggable
                key={gw.id}
                defaultPosition={{ x: defaultX, y: defaultY }}
                bounds="parent"
                onStop={(_, data) =>
                  onGatewayPositionChange(gw.id, data.x, data.y)
                }
              >
                <div
                  className="absolute flex items-center justify-center w-8 h-8 rounded-full
                             bg-sv-accent shadow-lg cursor-move text-xs font-semibold"
                  title={gw.name}
                >
                  GW
                </div>
              </Draggable>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FloorPlanCanvas;
