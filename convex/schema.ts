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
});
