// ─── User ───────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role: "client" | "admin";
  company?: string;
  phone?: string;
  createdAt: string;
}

// ─── Auth ───────────────────────────────────────────────────────
export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// ─── Project ────────────────────────────────────────────────────
export type ProjectStatus = "active" | "completed" | "on-hold" | "draft";

export interface Deliverable {
  id: string;
  title: string;
  completed: boolean;
}

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
  user?: string;
  avatar?: string;
  type: "comment" | "update" | "upload" | "milestone";
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  thumbnail?: string;
  category: string;
  startDate: string;
  deadline?: string;
  client: string;
  brief: string;
  deliverables: Deliverable[];
  activity: ActivityItem[];
  tags: string[];
}

// ─── Invoice ────────────────────────────────────────────────────
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  client: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  projectSlug?: string;
}

// ─── File ───────────────────────────────────────────────────────
export type FileType = "image" | "document" | "video" | "design" | "archive" | "other";

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  size: number;
  url: string;
  thumbnail?: string;
  uploadedAt: string;
  uploadedBy: string;
  projectSlug?: string;
  mimeType: string;
}

// ─── Message ────────────────────────────────────────────────────
export interface MessageThread {
  id: string;
  subject: string;
  participants: { name: string; avatar?: string }[];
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  projectSlug?: string;
}

export interface Message {
  id: string;
  threadId: string;
  body: string;
  sender: string;
  senderAvatar?: string;
  timestamp: string;
  attachments?: { name: string; url: string; size: number }[];
}

// ─── Module ─────────────────────────────────────────────────────
export interface Module {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  enabled: boolean;
  category: string;
}

// ─── Storage ────────────────────────────────────────────────────
export interface StorageInfo {
  used: number;
  total: number;
}

// ─── Navigation ─────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
