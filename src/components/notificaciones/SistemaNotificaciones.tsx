import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "favoriteAdded" | "favoriteRemoved";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

interface ToastStyle {
  title: string;
  sideColor: string;
  iconColor: string;
  icon: "check" | "error" | "warning" | "info" | "starFilled" | "starEmpty";
}

const ADD_TOAST_EVENT = "cb-andratx:add-toast";
const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4500;

const toastStyles: Record<ToastType, ToastStyle> = {
  success: {
    title: "Operación completada",
    sideColor: "bg-success",
    iconColor: "text-success",
    icon: "check",
  },
  error: {
    title: "Ha ocurrido un error",
    sideColor: "bg-error",
    iconColor: "text-error",
    icon: "error",
  },
  warning: {
    title: "Atención",
    sideColor: "bg-primary",
    iconColor: "text-primary",
    icon: "warning",
  },
  info: {
    title: "Información",
    sideColor: "bg-secondary",
    iconColor: "text-secondary",
    icon: "info",
  },
  favoriteAdded: {
    title: "Añadido a favoritos",
    sideColor: "bg-primary",
    iconColor: "text-primary",
    icon: "starFilled",
  },
  favoriteRemoved: {
    title: "Eliminado de favoritos",
    sideColor: "bg-outline",
    iconColor: "text-outline",
    icon: "starEmpty",
  },
};

function createToastId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToastIcon({ icon }: { icon: ToastStyle["icon"] }) {
  if (icon === "starFilled") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="m12 2.8 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9L12 2.8Z" />
      </svg>
    );
  }

  if (icon === "starEmpty") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m12 3.4 2.52 5.1 5.63.82-4.07 3.97.96 5.61L12 16.25 6.96 18.9l.96-5.61-4.07-3.97 5.63-.82L12 3.4Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "check") {
    return (
      <svg viewBox="0 -960 960 960" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M382-240 154-468l57-57 171 171 367-367 57 57z" />
      </svg>
    );
  }

  if (icon === "error") {
    return (
      <svg viewBox="0 -960 960 960" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M508.5-291.5Q520-303 520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280t28.5-11.5M440-440h80v-240h-80zm40 360q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80m0-80q134 0 227-93t93-227-93-227-227-93-227 93-93 227 93 227 227 93" />
      </svg>
    );
  }

  if (icon === "warning") {
    return (
      <svg viewBox="0 -960 960 960" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="m40-120 440-760 440 760zm138-80h604L480-720zm330.5-51.5Q520-263 520-280t-11.5-28.5T480-320t-28.5 11.5T440-280t11.5 28.5T480-240t28.5-11.5M440-360h80v-200h-80z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 -960 960 960" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M440-280h80v-240h-80v240Zm68.5-331.5Q520-623 520-640t-11.5-28.5Q497-680 480-680t-28.5 11.5Q440-657 440-640t11.5 28.5Q463-600 480-600t28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480t31.5-156T197-763q54-54 127-85.5T480-880t156 31.5T763-763q54 54 85.5 127T880-480t-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227-93-227-227-93-227 93-93 227 93 227 227 93Z" />
    </svg>
  );
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const style = toastStyles[toast.type];
  const hasDuration = toast.duration > 0;

  useEffect(() => {
    if (!hasDuration) {
      return;
    }

    const timer = window.setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast.id, toast.duration, hasDuration, onRemove]);

  const progressStyle = {
    "--toast-duration": `${toast.duration}ms`,
  } as CSSProperties;

  return (
    <article className="toast-enter pointer-events-auto relative flex w-full items-stretch overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-[0px_8px_32px_rgba(3,42,85,0.12)]" role={toast.type === "error" ? "alert" : "status"}>
      <div className={`w-1 shrink-0 ${style.sideColor}`} />

      <div className="relative flex-1 p-4">
        <div className="flex items-start gap-3">
          <span className={`mt-1 shrink-0 ${style.iconColor}`}>
            <ToastIcon icon={style.icon} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-label-bold text-label-bold text-on-surface">{style.title}</h3>

              <button type="button" onClick={() => onRemove(toast.id)} className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" aria-label="Cerrar notificación">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <p className="mt-1 text-[14px] leading-tight text-on-surface-variant">{toast.message}</p>
          </div>
        </div>
      </div>

      {hasDuration && <div className={`toast-progress absolute bottom-0 left-0 h-1 ${style.sideColor}`} style={progressStyle} />}
    </article>
  );
}

export function useToast() {
  const addToast = useCallback((options: ToastOptions) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ToastOptions>(ADD_TOAST_EVENT, {
        detail: options,
      }),
    );
  }, []);

  return { addToast };
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const queueRef = useRef<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) => {
      const updatedToasts = currentToasts.filter((toast) => toast.id !== id);

      if (queueRef.current.length > 0 && updatedToasts.length < MAX_TOASTS) {
        const nextToast = queueRef.current.shift();

        if (nextToast) {
          return [...updatedToasts, nextToast];
        }
      }

      return updatedToasts;
    });
  }, []);

  useEffect(() => {
    const handleAddToast = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const options = event.detail as ToastOptions;

      const newToast: Toast = {
        id: createToastId(),
        type: options.type,
        message: options.message,
        duration: options.duration ?? DEFAULT_DURATION,
      };

      setToasts((currentToasts) => {
        if (currentToasts.length < MAX_TOASTS) {
          return [...currentToasts, newToast];
        }

        queueRef.current.push(newToast);
        return currentToasts;
      });
    };

    window.addEventListener(ADD_TOAST_EVENT, handleAddToast);

    return () => {
      window.removeEventListener(ADD_TOAST_EVENT, handleAddToast);
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-9999 flex flex-col items-center gap-3 sm:left-auto sm:right-6 sm:w-95" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}