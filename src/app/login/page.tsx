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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);

  // Live brand + gallery lookup as the user types a known email
  const typedBrand = useQuery(
    api.projects.getBrandForEmail,
    email.includes("@") ? { email } : "skip"
  ) as { name: string | null; brandLogo: string | null; brandColor: string | null } | null | undefined;
  const gallery = useQuery(
    api.projects.getGalleryForEmail,
    email.includes("@") ? { email } : "skip"
  ) as string[] | null | undefined;

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

  const galleryImages = gallery ?? [];
  const [galleryIdx, setGalleryIdx] = useState(0);
  useEffect(() => {
    if (galleryImages.length < 2) return;
    const t = setInterval(() => setGalleryIdx((i) => (i + 1) % galleryImages.length), 7000);
    return () => clearInterval(t);
  }, [galleryImages.length]);

  return (
    <div className="flex min-h-screen bg-[#0A0A0B]">
      {/* ── Left: client work gallery (only their projects' imagery) ── */}
      <div className="studio-noise relative hidden w-1/2 overflow-hidden lg:block">
        {galleryImages.length > 0 ? (
          <>
            {galleryImages.map((src, i) => (
              <div
                key={src}
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1600ms] ease-in-out"
                style={{
                  backgroundImage: `url(${src})`,
                  opacity: i === galleryIdx ? 1 : 0,
                  transform: i === galleryIdx ? "scale(1.06)" : "scale(1)",
                  transition: "opacity 1600ms ease-in-out, transform 8000ms ease-out",
                }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/30 to-transparent" />
            {/* gallery footer */}
            <div className="absolute bottom-8 left-8 right-8">
              {typedBrand?.name && (
                <p className="font-display text-lg font-semibold uppercase tracking-[0.14em] text-white/90">
                  {typedBrand.name}
                </p>
              )}
              <p className="mt-1 text-xs text-white/50">
                Work delivered by Oookea — Digital Atelier
              </p>
              {galleryImages.length > 1 && (
                <div className="mt-4 flex gap-1.5">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      className={`h-1 rounded-full transition-all ${i === galleryIdx ? "w-8 bg-[#1B1B1F]/80" : "w-3 bg-[#1B1B1F]/25"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Default: studio noir gradient with oversized O */
          <div className="absolute inset-0 bg-gradient-to-br from-[#111114] via-[#0A0A0B] to-[#15121f]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
              <span className="font-display text-[280px] font-black leading-none text-white/[0.04]">O</span>
            </div>
            <div className="absolute bottom-8 left-8 right-8">
              <p className="font-display text-lg font-semibold text-white/90">Oookea</p>
              <p className="mt-1 text-xs text-white/40">Digital Atelier</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: form ── */}
      <div className="flex w-full items-center justify-center px-4 lg:w-1/2">
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
                className="h-11 border-white/10 bg-[#1B1B1F] focus:border-[#6366F1] focus:ring-[#6366F1]"
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
                  className="h-11 border-white/10 bg-[#1B1B1F] pr-10 focus:border-[#6366F1] focus:ring-[#6366F1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400"
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

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Oookea Digital Atelier. All rights reserved.
        </p>
      </div>
    </div>
  );
}
