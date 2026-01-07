import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ToastContainer, {
  type ToastMessage,
  type ToastVariant,
} from "../components/common/Toast";

type ToastOptions = {
  duration?: number;
};

type ToastApi = {
  show: (message: ReactNode, variant?: ToastVariant, options?: ToastOptions) => void;
  success: (message: ReactNode, options?: ToastOptions) => void;
  error: (message: ReactNode, options?: ToastOptions) => void;
  info: (message: ReactNode, options?: ToastOptions) => void;
  warning: (message: ReactNode, options?: ToastOptions) => void;
};

type ToastContextValue = {
  toast: ToastApi;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4500;

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: ReactNode, variant: ToastVariant = "info", options?: ToastOptions) => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, message, variant }]);

      const duration = options?.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        window.setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const toast = useMemo<ToastApi>(
    () => ({
      show: showToast,
      success: (message, options) => showToast(message, "success", options),
      error: (message, options) => showToast(message, "error", options),
      info: (message, options) => showToast(message, "info", options),
      warning: (message, options) => showToast(message, "warning", options),
    }),
    [showToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  }
  return context;
}
