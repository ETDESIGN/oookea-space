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
