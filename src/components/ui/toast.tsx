"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, Loader2 } from "lucide-react";

/**
 * Studio toast system — glassmorphic, icon + microcopy, slide-in from
 * bottom-right. Usage:
 *   const toast = useToast();
 *   toast.success("Invoice sent", "Florian will see it instantly");
 */

export type ToastKind = "success" | "info" | "error" | "loading";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  loading: (title: string, description?: string) => void;
}

const ToastCtx = createContext<ToastApi>({
  success: () => {},
  info: () => {},
  error: () => {},
  loading: () => {},
});

export const useToast = () => useContext(ToastCtx);

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-4.5 w-4.5 text-[#22C55E]" />,
  info: <Info className="h-4.5 w-4.5 text-primary" />,
  error: <XCircle className="h-4.5 w-4.5 text-[#EF4444]" />,
  loading: <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, kind, title, description }]);
      if (kind !== "loading") {
        setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3600);
      }
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: (t, d) => push("success", t, d),
    info: (t, d) => push("info", t, d),
    error: (t, d) => push("error", t, d),
    loading: (t, d) => push("loading", t, d),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,360px)] flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-3 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              onClick={() => dismiss(t.id)}
            >
              <span className="mt-0.5 shrink-0">{ICONS[t.kind]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-50">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{t.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
