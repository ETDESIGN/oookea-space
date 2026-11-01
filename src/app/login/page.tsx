"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Eye, EyeOff, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { LatentBloom } from "@/components/latent-bloom";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);

  // Live brand lookup as the user types a known email
  const typedBrand = useQuery(
    api.projects.getBrandForEmail,
    email.includes("@") ? { email } : "skip"
  ) as { name: string | null; brandLogo: string | null; brandColor: string | null } | null | undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result && result.success === false) {
        setError(result.error || "Invalid email or password");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-[#0A0A0B]">
      {/* ── Left: Latent Bloom (diffusion field; client logo stage when known) ── */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <LatentBloom brandLogo={typedBrand?.brandLogo ?? null} brandColor={typedBrand?.brandColor ?? null} />
      </div>

      {/* ── Right: form ── */}
      <div className="relative flex w-full items-center justify-center px-4 lg:w-1/2">
        {/* Login Card */}
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131315]/90 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {/* Brand — co-branded lockup (updates live as the email is typed) */}
          <div className="mb-8 flex flex-col items-center gap-3">
            {typedBrand ? (
              <div className="flex flex-col items-center gap-3">
                {typedBrand.brandLogo ? (
                  <img src={typedBrand.brandLogo} alt={typedBrand.name ?? ""} className="h-9 w-auto max-w-[150px] object-contain" />
                ) : (
                  <span className="text-lg font-semibold uppercase tracking-[0.14em] text-zinc-100" style={typedBrand.brandColor ? { color: typedBrand.brandColor } : undefined}>
                    {typedBrand.name}
                  </span>
                )}
                <span className="text-xs font-light text-zinc-400">×</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-[0_2px_12px_-2px_rgba(99,102,241,0.5)]">
                    <span className="text-sm font-black text-white">O</span>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold tracking-tight text-zinc-100">Oookea</span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Digital Atelier</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-lg shadow-[#6366F1]/30">
                  <span className="text-2xl font-black text-white">O</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                  Oookea
                </h1>
                <p className="mt-1 text-sm font-medium text-zinc-400 tracking-wide uppercase">
                  Digital Atelier
                </p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-100">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 border-white/10 bg-[#1B1B1F] text-white placeholder:text-white/35 caret-[#6366F1] focus:border-[#6366F1] focus:ring-[#6366F1] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out_e0s]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-100">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 border-white/10 bg-[#1B1B1F] pr-10 text-white placeholder:text-white/35 caret-[#6366F1] focus:border-[#6366F1] focus:ring-[#6366F1] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out_e0s]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/10 text-[#6366F1] focus:ring-[#6366F1]"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-medium text-[#6366F1] hover:text-[#4F46E5]"
                onClick={() => setShowForgotPw(!showForgotPw)}
              >
                Forgot password?
              </button>
            </div>

            {showForgotPw && (
              <div className="rounded-lg border border-blue-900/60 bg-blue-950/40 px-4 py-3 text-sm text-blue-300">
                Please contact your administrator at <a href="mailto:etiawork@gmail.com" className="font-medium underline">etiawork@gmail.com</a> to reset your password.
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-lg shadow-[#6366F1]/25"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Footer — pinned bottom-right of the screen */}
        <p className="absolute bottom-5 right-6 text-xs text-zinc-500">
          © {new Date().getFullYear()} Oookea Digital Atelier. All rights reserved.
        </p>
      </div>
    </div>
  );
}
