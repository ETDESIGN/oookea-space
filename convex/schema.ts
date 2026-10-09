import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ────────────────────────────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    // Co-branding
    brandLogo: v.optional(v.string()),   // storage URL of client logo
    brandColor: v.optional(v.string()),  // accent hex e.g. "#1E40AF"
    // Client health tracking
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // ─── Projects ─────────────────────────────────────────────────
  projects: defineTable({
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    brief: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("on-hold"),
      v.literal("draft")
    ),
    progress: v.number(),
    category: v.string(),
    thumbnail: v.optional(v.string()),
    startDate: v.string(),
    deadline: v.optional(v.string()),
    clientId: v.id("users"),
    tags: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // ─── Deliverables ─────────────────────────────────────────────
  deliverables: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    completed: v.boolean(),
    order: v.number(),
    // Approval workflow
    approvalStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("changes_requested")
      )
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    approvalNote: v.optional(v.string()),
    // Optional visual/context artifact for this deliverable
    artUrl: v.optional(v.string()),        // image URL for pin-to-comment
    artName: v.optional(v.string()),
    version: v.optional(v.number()),       // increments on each revision
  }).index("by_project", ["projectId"]),

  // ─── Invoices ─────────────────────────────────────────────────
  invoices: defineTable({
    number: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled")
    ),
    issueDate: v.string(),
    dueDate: v.string(),
    items: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
      })
    ),
    subtotal: v.number(),
    taxRate: v.number(),
    taxAmount: v.number(),
    total: v.number(),
    currency: v.string(),
    notes: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  // ─── Files ────────────────────────────────────────────────────
  files: defineTable({
    name: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    type: v.union(
      v.literal("image"),
      v.literal("document"),
      v.literal("video"),
      v.literal("design"),
      v.literal("archive"),
      v.literal("other")
    ),
    size: v.number(),
    mimeType: v.string(),
    storageId: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_project", ["projectId"]),

  // ─── Messages ─────────────────────────────────────────────────
  threads: defineTable({
    subject: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    body: v.string(),
    senderId: v.id("users"),
    senderRole: v.union(v.literal("admin"), v.literal("client")),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          storageId: v.string(),
          size: v.number(),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  // ─── Modules ──────────────────────────────────────────────────
  modules: defineTable({
    clientId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    category: v.string(),
    embedUrl: v.optional(v.string()),
    config: v.optional(v.any()),
    enabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_client_slug", ["clientId", "slug"]),

  // ─── Sessions ──────────────────────────────────────────────────
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // ─── Users extra fields (co-branding) live on the users table:
  // brandLogo (storage URL), brandColor (hex) — set by admin.

  // ─── Shareable Review Links ────────────────────────────────────
  // Password-protected public links to a deliverable/project for
  // stakeholders without accounts.
  reviewLinks: defineTable({
    token: v.string(),                     // random public token
    projectId: v.id("projects"),
    deliverableId: v.optional(v.id("deliverables")),
    title: v.string(),
    passwordHash: v.string(),             // PBKDF2, same as users
    createdById: v.id("users"),           // admin who created it
    expiresAt: v.number(),
    views: v.number(),
    lastViewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_project", ["projectId"]),

  // ─── Review link comments (public, name-tagged) ───────────────
  reviewComments: defineTable({
    linkToken: v.string(),
    authorName: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_link", ["linkToken", "createdAt"]),

  // ─── Brand Kits (per-client brand source of truth) ─────────────
  brandKits: defineTable({
    clientId: v.id("users"),
    tagline: v.optional(v.string()),
    primaryLogo: v.optional(v.string()),
    primaryLogoName: v.optional(v.string()),
    monoLogo: v.optional(v.string()),
    monoLogoName: v.optional(v.string()),
    logoLockupNote: v.optional(v.string()),
    colors: v.optional(
      v.array(
        v.object({
          name: v.string(),
          hex: v.string(),
          usage: v.optional(v.string()),
        })
      )
    ),
    fonts: v.optional(
      v.array(
        v.object({
          role: v.string(),
          family: v.string(),
          note: v.optional(v.string()),
        })
      )
    ),
    toneOfVoice: v.optional(v.string()),
    usageNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"]),

  // ─── Deliverable pins (visual annotations) ─────────────────────
  deliverablePins: defineTable({
    deliverableId: v.id("deliverables"),
    x: v.number(),                     // 0..1 relative position
    y: v.number(),
    authorId: v.id("users"),
    authorName: v.string(),
    body: v.string(),
    resolved: v.boolean(),
    createdAt: v.number(),
  }).index("by_deliverable", ["deliverableId"]),

  // ─── Case Studies (published completed work) ───────────────────
  caseStudies: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    summary: v.optional(v.string()),
    story: v.optional(v.string()),
    coverUrl: v.optional(v.string()),   // storage URL of the cover
    year: v.number(),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_year", ["year"]),

  // ─── Notifications ────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"),          // recipient
    type: v.union(
      v.literal("message"),
      v.literal("invoice"),
      v.literal("project"),
      v.literal("file")
    ),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),   // in-app route, e.g. /invoices/xyz
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unread", ["userId", "read"]),

  // ─── Activity Log ─────────────────────────────────────────────
  activity: defineTable({
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    type: v.union(
      v.literal("comment"),
      v.literal("update"),
      v.literal("upload"),
      v.literal("milestone"),
      v.literal("invoice")
    ),
    message: v.string(),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_project", ["projectId"]),

  // ─── Mission Control: Integrations ─────────────────────────────
  // One row per external provider (vercel/netlify/cloudflare/github/internal).
  // Credentials are NEVER stored here — only a reference + the inbound
  // webhook secret providers use to authenticate pushes to us.
  integrations: defineTable({
    provider: v.string(), // "vercel" | "netlify" | "cloudflare" | "github" | "internal"
    name: v.string(),
    credentialRef: v.optional(v.string()), // WHERE the secret lives, never the secret
    webhookSecret: v.optional(v.string()), // inbound push auth (Netlify/etc.)
    status: v.union(
      v.literal("ok"),
      v.literal("setup"),   // credentials not provided yet
      v.literal("error"),
      v.literal("unknown")
    ),
    detail: v.optional(v.string()),        // human-readable last status line
    enabled: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    lastEventAt: v.optional(v.number()),
    lastEventOk: v.optional(v.boolean()),
    lastError: v.optional(v.string()),
    config: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_provider", ["provider"]),

  // ─── Mission Control: Integration Events (audit trail) ─────────
  integrationEvents: defineTable({
    integrationId: v.id("integrations"),
    provider: v.string(),
    event: v.string(),                     // "deploy_created", "snapshot", "heartbeat", "setup"…
    ok: v.boolean(),
    summary: v.string(),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_integration", ["integrationId", "createdAt"])
    .index("by_created", ["createdAt"]),

  // ─── Mission Control: Heartbeats (cron dead-man's-switch) ──────
  // Crons ping GET /api/heartbeat/:token after each run. Silence past
  // the expected interval (with grace) = "missed" = red tile.
  heartbeats: defineTable({
    name: v.string(),
    token: v.string(),                     // random, part of the ping URL
    expectedIntervalSec: v.number(),       // how often the job SHOULD run
    enabled: v.boolean(),
    lastBeatAt: v.optional(v.number()),
    lastNote: v.optional(v.string()),
    lastOk: v.optional(v.boolean()),
    consecutiveMisses: v.number(),
    status: v.union(
      v.literal("waiting"),   // created, never beaten yet
      v.literal("ok"),
      v.literal("missed"),
      v.literal("paused")
    ),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  // ─── Mission Control: Apps (the fleet / launcher) ───────────────
  // Every project, product and piece of infra E runs, as one icon grid.
  // Health is derived: statusOverride > linked heartbeat > linked Vercel
  // project deploy state > default ok.
  apps: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("client"),
      v.literal("product"),
      v.literal("internal"),
      v.literal("infra"),
      v.literal("trading")
    ),
    icon: v.optional(v.string()),          // lucide icon key
    iconUrl: v.optional(v.string()),       // external SVG (selfh.st etc.)
    url: v.optional(v.string()),           // main link (opens in new tab)
    repoUrl: v.optional(v.string()),
    vercelProject: v.optional(v.string()), // auto-health: latest prod deploy
    heartbeatName: v.optional(v.string()), // auto-health: linked monitor
    statusOverride: v.optional(
      v.union(
        v.literal("ok"),
        v.literal("issue"),
        v.literal("offline"),
        v.literal("planned")
      )
    ),
    statusNote: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    order: v.number(),
    // Live HTTP probe results (written by the ping engine)
    lastPingAt: v.optional(v.number()),
    lastMs: v.optional(v.number()),
    lastOk: v.optional(v.boolean()),
    lastStatusCode: v.optional(v.number()),
    // Info-tab extras
    brandIcon: v.optional(v.string()),           // simpleicons slug → cdn.simpleicons.org
    links: v.optional(                           // structured link list
      v.array(
        v.object({
          label: v.string(),
          url: v.string(),
          kind: v.optional(v.string()), // app|repo|staging|dashboard|docs|chat|web
        })
      )
    ),
    info: v.optional(
      v.object({
        purpose: v.optional(v.string()),
        stack: v.optional(v.array(v.string())),
        domains: v.optional(v.array(v.string())),
        launched: v.optional(v.string()),
        owner: v.optional(v.string()),
        notes: v.optional(v.string()),
        blocks: v.optional(
          v.array(v.object({ title: v.string(), body: v.string() }))
        ),
      })
    ),
    // Public status-page publication (per-client branded pages at /status/:slug)
    publicStatus: v.optional(
      v.object({
        slug: v.string(),
        enabled: v.boolean(),
        brandName: v.string(),
        logoUrl: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        tagline: v.optional(v.string()),
      })
    ),
    // Rolling probe latency history for sparklines (capped at 48 points)
    latencyHistory: v.optional(
      v.array(v.object({ t: v.number(), ms: v.number(), ok: v.boolean() }))
    ),
    // Exclude from the HTTP probe sweep (e.g. API-only backends with no
    // public root route — a 404 there means nothing about health).
    probeExclude: v.optional(v.boolean()),
    // Where the work lives: local folders, docs, Obsidian
    folders: v.optional(
      v.object({
        local: v.optional(v.string()),   // path on this Mac (/Users/e/...)
        remote: v.optional(v.string()),  // path on another box (estudio:/home/e/...)
        docs: v.optional(v.string()),    // docs folder path
        obsidian: v.optional(v.string()),// obsidian:// URI
      })
    ),
    // Access & credentials. Production keys stay in KEYS.md — this holds
    // demo/admin logins + references only.
    access: v.optional(
      v.object({
        demo: v.optional(
          v.object({
            url: v.optional(v.string()),
            user: v.optional(v.string()),
            pass: v.optional(v.string()),
            note: v.optional(v.string()),
          })
        ),
        admin: v.optional(
          v.object({
            url: v.optional(v.string()),
            user: v.optional(v.string()),
            pass: v.optional(v.string()),
            note: v.optional(v.string()),
          })
        ),
        keysRef: v.optional(v.string()), // e.g. "KEYS.md › Caneles › Stripe test keys"
        notes: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_public_slug", ["publicStatus.slug"]),
  // One doc per app per UTC day. Feeds the 30-day uptime bar strip.
  appChecks: defineTable({
    appId: v.id("apps"),
    day: v.string(), // "2026-10-09" (UTC)
    pings: v.number(),
    fails: v.number(),
    msSum: v.number(),
    lastMs: v.optional(v.number()),
  })
    .index("by_app_day", ["appId", "day"])
    .index("by_day", ["day"]),

  // ─── R3b: Payment instructions (no processor — manual pay page) ──
  // Single row. Shown to clients on sent/overdue invoices so they know
  // exactly how to pay. Bank details here are MEANT to be client-visible.
  paymentSettings: defineTable({
    accountName: v.optional(v.string()),   // legal name on the account
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()), // IBAN or account number
    swiftBic: v.optional(v.string()),
    methods: v.optional(                   // alternative rails
      v.array(
        v.object({
          label: v.string(),               // "PayMe", "Wise", "Revolut", "Crypto (USDT)"
          value: v.string(),               // link / tag / address
          note: v.optional(v.string()),
        })
      )
    ),
    instructions: v.optional(v.string()),  // free-text paragraph (reference policy, etc.)
    contactEmail: v.optional(v.string()),  // "paid? email us here"
    defaultCurrency: v.optional(v.string()),
    updatedAt: v.number(),
  }),

  // ─── Mission Control: Action Queue (R3a) ────────────────────────
  // Everything needing E's attention becomes one dismissible row.
  // Auto-inserted by syncQueue (probe down, heartbeat missed, deploy
  // failing), auto-resolved when the condition clears. R3b/c add
  // invoices/deadlines/quiet-client items through the same table.
  actionQueue: defineTable({
    kind: v.string(),              // app-down | hb-missed | vercel-fail | invoice | deadline | quiet-client
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
    title: v.string(),
    detail: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    source: v.string(),            // pings | heartbeats | vercel | manual | money | clients
    appId: v.optional(v.id("apps")),
    status: v.union(v.literal("open"), v.literal("done"), v.literal("snoozed")),
    snoozedUntil: v.optional(v.number()),
    dedupeKey: v.optional(v.string()), // one open row per key
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_dedupe", ["dedupeKey", "status"]),
});
