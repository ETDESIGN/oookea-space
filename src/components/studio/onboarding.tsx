"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { FolderKanban, CheckCircle2, MessageSquare, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Onboarding — first-login welcome overlay.
 * 2 steps: welcome with the co-brand lockup, then a 3-tile orientation.
 * Skippable, remembered in localStorage.
 */
export function Onboarding() {
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    const seen = localStorage.getItem("oookea_onboarded");
    if (!seen) setStep(0);
  }, [isLoading, user]);

  const finish = () => {
    localStorage.setItem("oookea_onboarded", "1");
    setStep(null);
  };

  if (step === null) return null;

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.94, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#131315] shadow-2xl"
        >
          <button
            onClick={finish}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>

          {step === 0 ? (
            <div className="flex flex-col items-center px-8 py-12 text-center">
              {/* O mark draws in */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
                className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-[0_8px_40px_-8px_rgba(99,102,241,0.7)]"
              >
                <span className="text-3xl font-black text-white">O</span>
              </motion.div>
              <h1 className="font-display mt-6 text-2xl font-bold text-zinc-50">
                Welcome to your Oookea Space, {firstName}
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                Everything for our work together lives here — your projects,
                approvals, files, and our conversations. One place, always current.
              </p>
              <Button
                onClick={() => setStep(1)}
                className="mt-8 gap-2 bg-primary text-white hover:bg-primary/90"
              >
                Take the 10-second tour
                <ArrowRight className="h-4 w-4" />
              </Button>
              <button onClick={finish} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
                Skip — I&apos;ll explore myself
              </button>
            </div>
          ) : (
            <div className="px-8 py-10">
              <h2 className="font-display text-center text-xl font-bold text-zinc-50">
                Three things to know
              </h2>
              <div className="mt-6 space-y-3">
                {[
                  {
                    icon: <FolderKanban className="h-5 w-5 text-primary" />,
                    title: "Your projects, live",
                    body: "Progress updates in real time — no more asking for status.",
                  },
                  {
                    icon: <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />,
                    title: "You approve the work",
                    body: "Deliverables arrive for your review — approve with one click, or tell us what to change.",
                  },
                  {
                    icon: <MessageSquare className="h-5 w-5 text-[#F59E0B]" />,
                    title: "Talk to us anytime",
                    body: "Message the studio directly — we usually reply within a day.",
                  },
                ].map((row, i) => (
                  <motion.div
                    key={row.title}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.12 }}
                    className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                      {row.icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{row.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{row.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Button onClick={finish} className="mt-6 w-full bg-primary text-white hover:bg-primary/90">
                Let&apos;s go
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
