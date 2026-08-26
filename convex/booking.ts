import { v } from "convex/values";
import { mutation as m } from "./_generated/server";
import { requireAdmin } from "./auth";

// ─── Booking (review-call scheduling) ───────────────────────────
// Admin configures a booking embed URL (Cal.com / Calendly) per studio.
// The Modules page renders it as "Book a review call".

export const setBookingUrl = m({
  args: { token: v.string(), bookingUrl: v.string() },
  handler: async (ctx, { token, bookingUrl }) => {
    await requireAdmin(ctx, token);
    // store as a settings-ish singleton in the settings table if present,
    // otherwise reuse modules with slug 'book-review-call' owned by the admin
    const existing = await ctx.db
      .query("modules")
      .filter((q) => q.eq(q.field("slug"), "book-review-call"))
      .first();
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    if (!admins) throw new Error("No admin user");
    if (existing) {
      await ctx.db.patch(existing._id, { embedUrl: bookingUrl, enabled: true });
      return existing._id;
    }
    return await ctx.db.insert("modules", {
      clientId: admins._id,
      title: "Book a review call",
      slug: "book-review-call",
      description: "Grab 15 minutes with the studio to walk through work together.",
      category: "Scheduling",
      embedUrl: bookingUrl,
      enabled: true,
      createdAt: Date.now(),
    });
  },
});
