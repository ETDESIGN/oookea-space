"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import {
  X,
  Play,
  ExternalLink,
  Image as ImageIcon,
  BarChart3,
  BookOpen,
  Video,
} from "lucide-react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
interface VaultVideo {
  id: string;
  url: string;
  title: string;
}

interface VaultConfig {
  videos: VaultVideo[];
  photoAlbumUrl?: string;
  catalogueUrl: string;
  marketingDashboardUrl: string;
}

/* ──────────────────────────────────────────────
   Data — YouTube videos (7)
   ────────────────────────────────────────────── */
const DEFAULT_VIDEOS: VaultVideo[] = [
  { id: "gr9Zrlt4UdY", url: "https://youtu.be/gr9Zrlt4UdY", title: "Video 1" },
  { id: "zl53so5Sdbo", url: "https://youtu.be/zl53so5Sdbo", title: "Video 2" },
  { id: "svOafcHz0Jo", url: "https://youtu.be/svOafcHz0Jo", title: "Video 3" },
  { id: "Ruq6LD2mY1Y", url: "https://youtu.be/Ruq6LD2mY1Y", title: "Video 4" },
  { id: "x9gVbVFyV70", url: "https://youtu.be/x9gVbVFyV70", title: "Video 5" },
  { id: "Ao7lVvlioaU", url: "https://youtu.be/Ao7lVvlioaU", title: "Video 6" },
  { id: "8UQA6cvtm-A", url: "https://youtube.com/shorts/8UQA6cvtm-A", title: "Short 1" },
];

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

/** Full-screen YouTube player overlay */
function YouTubePlayer({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1 text-sm"
        >
          <X className="h-5 w-5" /> Close
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

/** Video Library modal — grid of thumbnails */
function VideoLibraryModal({ videos, onClose }: { videos: VaultVideo[]; onClose: () => void }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="vault-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors vault-close-btn"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Hero */}
          <div className="h-40 md:h-52 relative flex items-center justify-center vault-card-hero vault-hero-red">
            <Video className="h-16 w-16 text-white/30" />
          </div>

          <div className="p-6 md:p-10">
            <h2 className="text-xl md:text-2xl font-bold vault-text mb-2">Video Library</h2>
            <p className="text-sm md:text-base vault-text-muted mb-6">
              High-fidelity video content produced for your brand campaigns.
            </p>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setActiveVideo(video.id)}
                  className="group relative aspect-video rounded-lg overflow-hidden bg-black/20 hover:ring-2 hover:ring-red-500/60 transition-all"
                >
                  <img
                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Nested YouTube player */}
      {activeVideo && (
        <YouTubePlayer videoId={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  );
}

/** Photo Library modal */
function PhotoLibraryModal({ url, onClose }: { url?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="vault-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors vault-close-btn"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="h-40 md:h-52 relative flex items-center justify-center vault-card-hero vault-hero-blue">
          <ImageIcon className="h-16 w-16 text-white/30" />
        </div>

        <div className="p-6 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold vault-text mb-2">Photo Library</h2>
          <p className="text-sm md:text-base vault-text-muted mb-6">
            Curated high-resolution photography for all brand touchpoints.
          </p>
          <p className="text-sm vault-text-muted mb-8 max-w-2xl">
            Browse and download approved lifestyle, product, and event photography. Assets are organized by campaign and tagged for easy searchability across your teams.
          </p>

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Browse Gallery
            </a>
          ) : (
            <p className="text-sm vault-text-muted">Gallery link coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Generic web app modal (catalogue / dashboard) */
function WebAppModal({
  title,
  subtitle,
  description,
  url,
  accent,
  icon: Icon,
  onClose,
}: {
  title: string;
  subtitle: string;
  description: string;
  url: string;
  accent: string;
  icon: React.ElementType;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="vault-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors vault-close-btn"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`h-40 md:h-52 relative flex items-center justify-center vault-card-hero ${accent}`}>
          <Icon className="h-16 w-16 text-white/30" />
        </div>

        <div className="p-6 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold vault-text mb-2">{title}</h2>
          <p className="text-sm md:text-base vault-text-muted mb-6">{subtitle}</p>
          <p className="text-sm vault-text-muted mb-8 max-w-2xl">{description}</p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors ${
              accent === "vault-hero-purple" ? "bg-purple-600 hover:bg-purple-700" : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            <ExternalLink className="h-4 w-4" />
            Launch {title}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Vault Dashboard
   ────────────────────────────────────────────── */

type ModalType = "video" | "photo" | "catalogue" | "marketing" | null;

export function VaultDashboard({ config }: { config?: VaultConfig }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const videos = config?.videos ?? DEFAULT_VIDEOS;
  const photoUrl = config?.photoAlbumUrl;
  const catalogueUrl = config?.catalogueUrl ?? "https://inerys-nomenclature-catalogue-1007612247244.us-east1.run.app/";
  const marketingUrl = config?.marketingDashboardUrl ?? "https://inerys-marketing-dashboard.vercel.app/";

  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <>
      <div className={isDark ? "vault-dark" : "vault-light"}>
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className={`text-2xl md:text-4xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
            Vault Dashboard
          </h1>
          <p className={`mt-2 text-sm md:text-lg max-w-2xl ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Access all digital deliverables, brand assets, and marketing analytics curated for INERYS.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-min">
          {/* Card 1: Video Library — 2 cols */}
          <button
            onClick={() => setActiveModal("video")}
            className={`group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 md:col-span-2 text-left
              ${isDark
                ? "bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                : "bg-white border border-gray-200 hover:shadow-lg hover:border-gray-300"
              }`}
          >
            <div className="h-36 md:h-52 bg-gradient-to-br from-red-950/60 to-transparent relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              <Play className="h-12 w-12 text-white/70 z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Video Library</h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  YouTube
                </span>
              </div>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{videos.length} brand videos</p>
            </div>
          </button>

          {/* Card 2: Photo Library */}
          <button
            onClick={() => setActiveModal("photo")}
            className={`group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 text-left
              ${isDark
                ? "bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                : "bg-white border border-gray-200 hover:shadow-lg hover:border-gray-300"
              }`}
          >
            <div className="h-36 md:h-52 bg-gradient-to-br from-blue-950/60 to-transparent relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              <ImageIcon className="h-12 w-12 text-white/70 z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Photo Library</h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Google Photos
                </span>
              </div>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Shared Album</p>
            </div>
          </button>

          {/* Card 3: Nomenclature Catalogue */}
          <button
            onClick={() => setActiveModal("catalogue")}
            className={`group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 text-left
              ${isDark
                ? "bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                : "bg-white border border-gray-200 hover:shadow-lg hover:border-gray-300"
              }`}
          >
            <div className="h-36 md:h-52 bg-gradient-to-br from-purple-950/60 to-transparent relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              <BookOpen className="h-12 w-12 text-white/70 z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Nomenclature</h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Web App
                </span>
              </div>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Online Catalogue</p>
            </div>
          </button>

          {/* Card 4: Marketing Dashboard — 2 cols */}
          <button
            onClick={() => setActiveModal("marketing")}
            className={`group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 md:col-span-2 text-left
              ${isDark
                ? "bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                : "bg-white border border-gray-200 hover:shadow-lg hover:border-gray-300"
              }`}
          >
            <div className="h-36 md:h-52 bg-gradient-to-br from-teal-950/60 to-transparent relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
              <BarChart3 className="h-12 w-12 text-white/70 z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Marketing Dashboard</h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Analytics
                </span>
              </div>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Campaign Performance & Metrics</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "video" && (
        <VideoLibraryModal videos={videos} onClose={closeModal} />
      )}
      {activeModal === "photo" && (
        <PhotoLibraryModal url={photoUrl} onClose={closeModal} />
      )}
      {activeModal === "catalogue" && (
        <WebAppModal
          title="Nomenclature Catalogue"
          subtitle="Your comprehensive digital product taxonomy and specs."
          description="Access the live, up-to-date database of product names, technical specifications, and internal identifiers. This web app ensures consistency across all technical documentation and marketing materials."
          url={catalogueUrl}
          accent="vault-hero-purple"
          icon={BookOpen}
          onClose={closeModal}
        />
      )}
      {activeModal === "marketing" && (
        <WebAppModal
          title="Marketing Dashboard"
          subtitle="Real-time analytics and campaign performance tracking."
          description="Monitor KPIs, engagement metrics, and conversion rates across all active channels. This centralized view pulls data from various platforms to provide actionable insights for your marketing strategy."
          url={marketingUrl}
          accent="vault-hero-teal"
          icon={BarChart3}
          onClose={closeModal}
        />
      )}
    </>
  );
}
