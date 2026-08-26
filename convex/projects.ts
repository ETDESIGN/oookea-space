// ─── Compatibility shim ─────────────────────────────────────────
// The monolith was split into domain modules. All functions are re-exported
// here so existing `api.projects.*` frontend references keep working.
export * from "./users";
export * from "./projects_impl";
export * from "./invoices";
export * from "./files";
export * from "./messages";
export * from "./misc";
export * from "./approvals";
export * from "./reviewLinks";
export * from "./analytics";
