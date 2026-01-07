import type { ReactNode } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastMessage = {
  id: string;
  message: ReactNode;
  variant: ToastVariant;
};

type ToastContainerProps = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  error: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  info: "border-sky-400/30 bg-sky-500/15 text-sky-100",
  warning: "border-amber-400/30 bg-amber-500/15 text-amber-100",
};

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-4 z-[100] flex w-[320px] max-w-[90vw] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur ${
            variantStyles[toast.variant]
          }`}
        >
          <div className="flex-1 leading-relaxed">{toast.message}</div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-[10px] uppercase tracking-wide text-white/70 transition hover:text-white"
            aria-label="Fechar aviso"
          >
            Fechar
          </button>
        </div>
      ))}
    </div>
  );
}
