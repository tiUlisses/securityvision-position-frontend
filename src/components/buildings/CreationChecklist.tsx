import React from "react";

export interface CreationStep {
  title: string;
  description: string;
  done: boolean;
}

interface CreationChecklistProps {
  steps: CreationStep[];
}

const CreationChecklist: React.FC<CreationChecklistProps> = ({ steps }) => {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Fluxo recomendado
          </h2>
          <p className="text-xs text-slate-400">
            Siga a ordem abaixo para manter a consistência entre prédios,
            andares, plantas e dispositivos.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex items-start gap-2 bg-slate-900/60 border border-slate-800 rounded-lg p-3"
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                step.done
                  ? "border-green-400 bg-green-500/10 text-green-300"
                  : "border-slate-700 bg-slate-800 text-slate-500"
              }`}
              aria-hidden
            >
              {step.done ? "✓" : ""}
            </span>
            <div>
              <div className="text-sm font-medium text-slate-100">
                {step.title}
              </div>
              <p className="text-xs text-slate-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreationChecklist;
