import { v } from "convex/values";
import { query as q, mutation as m } from "./_generated/server";

// ─── Password Hashing ───────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// ─── Users ──────────────────────────────────────────────────────

export const loginUser = q({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;
    return user;
  },
});

export const getCurrentUser = q({
  args: {},
  handler: async (ctx) => {
    return null;
  },
});

export const getUserById = q({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const listClients = q({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "client"))
      .collect();
  },
});

export const createClient = m({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check email doesn't exist
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error("Email already registered");

    const passwordHash = await hashPassword(args.password);
    const { password: _, ...rest } = args;

    return await ctx.db.insert("users", {
      ...rest,
      passwordHash,
      role: "client",
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = m({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const updateClient = m({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, { id, ...updates }) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

// ─── Projects ───────────────────────────────────────────────────

export const listProjects = q({
  args: { clientId: v.optional(v.id("users")) },
  handler: async (ctx, { clientId }) => {
    if (clientId) {
      return await ctx.db
        .query("projects")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("projects").order("desc").collect();
  },
});

export const getProject = q({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const createProject = m({
  args: {
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    brief: v.optional(v.string()),
    category: v.string(),
    clientId: v.id("users"),
    startDate: v.string(),
    deadline: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    websiteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("projects", {
      ...args,
      status: "active",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProject = m({
  args: {
    id: v.id("projects"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("on-hold"), v.literal("draft"))),
    progress: v.optional(v.number()),
    brief: v.optional(v.string()),
    deadline: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...cleanUpdates, updatedAt: Date.now() });
  },
});

// ─── Deliverables ───────────────────────────────────────────────

export const listDeliverables = q({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const addDeliverable = m({
  args: { projectId: v.id("projects"), title: v.string(), order: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deliverables", {
      ...args,
      completed: false,
    });
  },
});

export const toggleDeliverable = m({
  args: { id: v.id("deliverables"), completed: v.boolean() },
  handler: async (ctx, { id, completed }) => {
    await ctx.db.patch(id, { completed });
  },
});

// ─── Invoices ───────────────────────────────────────────────────

export const listInvoices = q({
  args: {
    clientId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled"))),
  },
  handler: async (ctx, { clientId, status }) => {
    let q = ctx.db.query("invoices").order("desc");
    if (clientId) {
      q = ctx.db
        .query("invoices")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .order("desc");
    }
    let results = await q.collect();
    if (status) {
      results = results.filter((inv) => inv.status === status);
    }
    return results;
  },
});

export const getInvoice = q({
  args: { id: v.id("invoices") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const createInvoice = m({
  args: {
    number: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
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
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("invoices", {
      ...args,
      status: "draft",
      currency: args.currency || "USD",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateInvoiceStatus = m({
  args: { id: v.id("invoices"), status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"), v.literal("overdue"), v.literal("cancelled")) },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

// ─── File Storage ───────────────────────────────────────────────

export const generateUploadUrl = m({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = q({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// ─── Files ──────────────────────────────────────────────────────

export const listFiles = q({
  args: {
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { clientId, projectId }) => {
    if (clientId) {
      return await ctx.db
        .query("files")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .order("desc")
        .collect();
    }
    if (projectId) {
      return await ctx.db
        .query("files")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("files").order("desc").collect();
  },
});

export const createFile = m({
  args: {
    name: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    type: v.union(v.literal("image"), v.literal("document"), v.literal("video"), v.literal("design"), v.literal("archive"), v.literal("other")),
    size: v.number(),
    mimeType: v.string(),
    storageId: v.optional(v.string()),
    description: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("files", { ...args, createdAt: Date.now() });
  },
});

export const deleteFile = m({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// ─── Messages ───────────────────────────────────────────────────

export const listThreads = q({
  args: { clientId: v.optional(v.id("users")) },
  handler: async (ctx, { clientId }) => {
    if (clientId) {
      return await ctx.db
        .query("threads")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("threads")
      .withIndex("by_last_message")
      .order("desc")
      .collect();
  },
});

export const getThreadMessages = q({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc")
      .collect();
  },
});

export const createThread = m({
  args: {
    subject: v.string(),
    clientId: v.id("users"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("threads", {
      ...args,
      lastMessageAt: now,
      createdAt: now,
    });
  },
});

export const sendMessage = m({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
    senderId: v.id("users"),
    senderRole: v.union(v.literal("admin"), v.literal("client")),
  },
  handler: async (ctx, { threadId, body, senderId, senderRole }) => {
    const now = Date.now();
    await ctx.db.patch(threadId, { lastMessageAt: now });
    return await ctx.db.insert("messages", {
      threadId,
      body,
      senderId,
      senderRole,
      createdAt: now,
    });
  },
});

// ─── Modules ────────────────────────────────────────────────────

export const listModules = q({
  args: { clientId: v.id("users") },
  handler: async (ctx, { clientId }) => {
    return await ctx.db
      .query("modules")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect();
  },
});

export const toggleModule = m({
  args: { id: v.id("modules"), enabled: v.boolean() },
  handler: async (ctx, { id, enabled }) => {
    await ctx.db.patch(id, { enabled });
  },
});

export const addModule = m({
  args: {
    clientId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    category: v.string(),
    embedUrl: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("modules", { ...args, createdAt: Date.now() });
  },
});

// ─── Activity ───────────────────────────────────────────────────

export const listActivity = q({
  args: {
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clientId, projectId, limit }) => {
    let q = ctx.db.query("activity").order("desc");
    let results = await q.collect();

    if (clientId) {
      results = results.filter((a) => a.clientId === clientId);
    }
    if (projectId) {
      results = results.filter((a) => a.projectId === projectId);
    }
    if (limit) {
      results = results.slice(0, limit);
    }
    return results;
  },
});

export const logActivity = m({
  args: {
    clientId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    type: v.union(v.literal("comment"), v.literal("update"), v.literal("upload"), v.literal("milestone"), v.literal("invoice")),
    message: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activity", { ...args, createdAt: Date.now() });
  },
});

// ─── Seed Data ──────────────────────────────────────────────────

export const seed = m({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("users").first();
    if (existing) return "Already seeded";

    // Create admin
    const adminPassHash = await hashPassword("Remybrica-1");
    const adminId = await ctx.db.insert("users", {
      name: "Etia",
      email: "etiawork@gmail.com",
      passwordHash: adminPassHash,
      role: "admin",
      status: "active",
      createdAt: Date.now(),
    });

    // Create sample client
    const clientPassHash = await hashPassword("demo123");
    const clientId = await ctx.db.insert("users", {
      name: "Sarah Johnson",
      email: "sarah@techcorp.com",
      passwordHash: clientPassHash,
      role: "client",
      company: "TechCorp International",
      phone: "+1 (555) 123-4567",
      status: "active",
      createdAt: Date.now(),
    });

    // Create sample project
    const projectId = await ctx.db.insert("projects", {
      title: "Website Redesign",
      slug: "website-redesign",
      description: "Complete redesign of the corporate website",
      brief: "Full redesign including homepage, about, services, and contact pages.",
      status: "active",
      progress: 75,
      category: "Website",
      clientId,
      startDate: "2026-01-15",
      deadline: "2026-05-15",
      tags: ["design", "development"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Deliverables
    await ctx.db.insert("deliverables", { projectId, title: "Homepage mockup", completed: true, order: 1 });
    await ctx.db.insert("deliverables", { projectId, title: "UI style guide", completed: true, order: 2 });
    await ctx.db.insert("deliverables", { projectId, title: "Front-end development", completed: false, order: 3 });
    await ctx.db.insert("deliverables", { projectId, title: "QA testing & launch", completed: false, order: 4 });

    // Sample invoice
    await ctx.db.insert("invoices", {
      number: "INV-2026-001",
      clientId,
      projectId,
      status: "sent",
      issueDate: "2026-04-01",
      dueDate: "2026-04-30",
      items: [
        { description: "Website Design", quantity: 1, unitPrice: 3000, total: 3000 },
        { description: "Front-end Development", quantity: 1, unitPrice: 4000, total: 4000 },
        { description: "QA Testing", quantity: 1, unitPrice: 1000, total: 1000 },
      ],
      subtotal: 8000,
      taxRate: 10,
      taxAmount: 800,
      total: 8800,
      currency: "USD",
      notes: "Payment due within 30 days.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Sample module
    await ctx.db.insert("modules", {
      clientId,
      title: "AI Marketing Workflow",
      slug: "ai-marketing",
      description: "AI-powered marketing automation",
      category: "AI Workflow",
      enabled: true,
      createdAt: Date.now(),
    });

    return "Seed complete! Admin: etiawork@gmail.com (Remybrica-1), Client: sarah@techcorp.com (demo123)";
  },
});

export const resetAndSeed = m({
  args: {},
  handler: async (ctx) => {
    // Delete all data from all tables
    const tables = ["users", "projects", "invoices", "files", "threads", "messages", "deliverables", "modules", "activity"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    // Re-seed
    const adminPassHash = await hashPassword("Remybrica-1");
    const adminId = await ctx.db.insert("users", {
      name: "Etia",
      email: "etiawork@gmail.com",
      passwordHash: adminPassHash,
      role: "admin",
      status: "active",
      createdAt: Date.now(),
    });

    const clientPassHash = await hashPassword("demo123");
    const clientId = await ctx.db.insert("users", {
      name: "Sarah Johnson",
      email: "sarah@techcorp.com",
      passwordHash: clientPassHash,
      role: "client",
      company: "TechCorp International",
      phone: "+1 (555) 123-4567",
      status: "active",
      createdAt: Date.now(),
    });

    const projectId = await ctx.db.insert("projects", {
      title: "Website Redesign",
      slug: "website-redesign",
      description: "Complete redesign of the corporate website",
      brief: "Full redesign including homepage, about, services, and contact pages.",
      status: "active",
      progress: 75,
      category: "Website",
      clientId,
      startDate: "2026-01-15",
      deadline: "2026-05-15",
      tags: ["design", "development"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("deliverables", { projectId, title: "Homepage mockup", completed: true, order: 1 });
    await ctx.db.insert("deliverables", { projectId, title: "UI style guide", completed: true, order: 2 });
    await ctx.db.insert("deliverables", { projectId, title: "Front-end development", completed: false, order: 3 });
    await ctx.db.insert("deliverables", { projectId, title: "QA testing & launch", completed: false, order: 4 });

    await ctx.db.insert("invoices", {
      number: "INV-2026-001",
      clientId,
      projectId,
      status: "sent",
      issueDate: "2026-04-01",
      dueDate: "2026-04-30",
      items: [
        { description: "Website Design", quantity: 1, unitPrice: 3000, total: 3000 },
        { description: "Front-end Development", quantity: 1, unitPrice: 4000, total: 4000 },
        { description: "QA Testing", quantity: 1, unitPrice: 1000, total: 1000 },
      ],
      subtotal: 8000,
      taxRate: 10,
      taxAmount: 800,
      total: 8800,
      currency: "USD",
      notes: "Payment due within 30 days.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("modules", {
      clientId,
      title: "AI Marketing Workflow",
      slug: "ai-marketing",
      description: "AI-powered marketing automation",
      category: "AI Workflow",
      enabled: true,
      createdAt: Date.now(),
    });

    return "Reset & seed complete! Admin: etiawork@gmail.com (Remybrica-1), Client: sarah@techcorp.com (demo123)";
  },
});
