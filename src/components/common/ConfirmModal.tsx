import React from "react";
import Modal from "./Modal";

type Props = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose} maxWidthClass="max-w-lg">
      {description && (
        <div className="mb-4 text-sm text-slate-300">{description}</div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-60"
        >
          {cancelText}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`rounded-md px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
            danger ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-500 hover:bg-sky-600"
          }`}
        >
          {isLoading ? "Processando..." : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
