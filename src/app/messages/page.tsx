"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Search,
  Send,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  Mail,
  MailOpen,
} from "lucide-react";
import type { MessageThread, Message } from "@/types";

// ─── Mock Data ──────────────────────────────────────────────────

const mockThreads: MessageThread[] = [
  {
    id: "t1",
    subject: "Website Redesign — Homepage Review",
    participants: [
      { name: "Sarah Chen", avatar: "" },
      { name: "You" },
    ],
    lastMessage: "I've uploaded the revised mockups for the hero section. Can you take a look when you get a chance?",
    lastMessageAt: "2026-04-21T18:30:00Z",
    unread: true,
    projectSlug: "website-redesign",
  },
  {
    id: "t2",
    subject: "Brand Guidelines — Final Approval",
    participants: [
      { name: "Mike Torres", avatar: "" },
      { name: "You" },
    ],
    lastMessage: "The updated color palette looks great. Let's finalize the typography choices this week.",
    lastMessageAt: "2026-04-21T14:15:00Z",
    unread: true,
    projectSlug: "brand-identity",
  },
  {
    id: "t3",
    subject: "AI Marketing Workflow — Integration Update",
    participants: [
      { name: "Lena Park", avatar: "" },
      { name: "You" },
    ],
    lastMessage: "The OpenAI integration is complete. Moving on to the campaign scheduler module next.",
    lastMessageAt: "2026-04-20T09:45:00Z",
    unread: false,
    projectSlug: "ai-marketing-workflow",
  },
  {
    id: "t4",
    subject: "Product Sourcing — Supplier Onboarding",
    participants: [
      { name: "James Wright", avatar: "" },
      { name: "You" },
    ],
    lastMessage: "We've shortlisted 12 suppliers from the APAC region. Full report attached.",
    lastMessageAt: "2026-04-19T16:20:00Z",
    unread: false,
    projectSlug: "product-sourcing",
  },
  {
    id: "t5",
    subject: "OpenClaw Setup — Agent Configuration",
    participants: [
      { name: "Sarah Chen", avatar: "" },
      { name: "You" },
    ],
    lastMessage: "Agent is deployed to staging. Running integration tests now — will share results by EOD.",
    lastMessageAt: "2026-04-18T11:00:00Z",
    unread: false,
    projectSlug: "openclaw-setup",
  },
];

const mockMessages: Record<string, Message[]> = {
  t1: [
    {
      id: "m1",
      threadId: "t1",
      body: "Hi! I've been working on the homepage redesign based on our last meeting. I have a few questions about the hero section layout.",
      sender: "Sarah Chen",
      senderAvatar: "",
      timestamp: "2026-04-21T10:00:00Z",
    },
    {
      id: "m2",
      threadId: "t1",
      body: "Of course! What do you need feedback on?",
      sender: "You",
      senderAvatar: "",
      timestamp: "2026-04-21T10:15:00Z",
    },
    {
      id: "m3",
      threadId: "t1",
      body: "Mainly the CTA placement and the background treatment. Should we go with a full-width video or a static gradient? I'm attaching two options.",
      sender: "Sarah Chen",
      senderAvatar: "",
      timestamp: "2026-04-21T11:30:00Z",
      attachments: [
        { name: "hero-option-a.png", url: "/files/hero-a.png", size: 2400000 },
        { name: "hero-option-b.png", url: "/files/hero-b.png", size: 1850000 },
      ],
    },
    {
      id: "m4",
      threadId: "t1",
      body: "I like option B — the gradient feels cleaner. Let's go with that direction.",
      sender: "You",
      senderAvatar: "",
      timestamp: "2026-04-21T14:00:00Z",
    },
    {
      id: "m5",
      threadId: "t1",
      body: "I've uploaded the revised mockups for the hero section. Can you take a look when you get a chance?",
      sender: "Sarah Chen",
      senderAvatar: "",
      timestamp: "2026-04-21T18:30:00Z",
      attachments: [
        { name: "hero-revised-v2.fig", url: "/files/hero-v2.fig", size: 4200000 },
      ],
    },
  ],
  t2: [
    {
      id: "m6",
      threadId: "t2",
      body: "Hey! Here's the latest version of the brand guidelines. Colors are locked — just need sign-off on typography.",
      sender: "Mike Torres",
      senderAvatar: "",
      timestamp: "2026-04-21T09:00:00Z",
      attachments: [
        { name: "brand-guidelines-v3.pdf", url: "/files/brand-v3.pdf", size: 8500000 },
      ],
    },
    {
      id: "m7",
      threadId: "t2",
      body: "The updated color palette looks great. Let's finalize the typography choices this week.",
      sender: "Mike Torres",
      senderAvatar: "",
      timestamp: "2026-04-21T14:15:00Z",
    },
  ],
  t3: [
    {
      id: "m8",
      threadId: "t3",
      body: "Quick update: the OpenAI API integration passed all unit tests. We're on track for the milestone.",
      sender: "Lena Park",
      senderAvatar: "",
      timestamp: "2026-04-20T09:00:00Z",
    },
    {
      id: "m9",
      threadId: "t3",
      body: "The OpenAI integration is complete. Moving on to the campaign scheduler module next.",
      sender: "Lena Park",
      senderAvatar: "",
      timestamp: "2026-04-20T09:45:00Z",
    },
  ],
  t4: [
    {
      id: "m10",
      threadId: "t4",
      body: "Here are the top 12 APAC suppliers based on your criteria. Full evaluation report is attached.",
      sender: "James Wright",
      senderAvatar: "",
      timestamp: "2026-04-19T16:20:00Z",
      attachments: [
        { name: "supplier-report-apac.xlsx", url: "/files/suppliers.xlsx", size: 3200000 },
      ],
    },
  ],
  t5: [
    {
      id: "m11",
      threadId: "t5",
      body: "The OpenClaw agent is configured and deployed to the staging environment. Running a full integration test suite now.",
      sender: "Sarah Chen",
      senderAvatar: "",
      timestamp: "2026-04-18T10:00:00Z",
    },
    {
      id: "m12",
      threadId: "t5",
      body: "Agent is deployed to staging. Running integration tests now — will share results by EOD.",
      sender: "Sarah Chen",
      senderAvatar: "",
      timestamp: "2026-04-18T11:00:00Z",
    },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date("2026-04-21T20:00:00Z");
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Page ───────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");

  const filteredThreads = mockThreads.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const selectedThread = mockThreads.find((t) => t.id === selectedThreadId);
  const messages = selectedThreadId ? mockMessages[selectedThreadId] ?? [] : [];

  const handleSend = () => {
    if (!replyText.trim()) return;
    // In production, this would POST to an API
    setReplyText("");
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Messages</h1>
            <p className="mt-1 text-[#64748B]">
              Communicate with your team on project updates and deliverables.
            </p>
          </div>

          {/* Two-panel layout */}
          <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            {/* Left panel — Thread list */}
            <div
              className={`flex w-full flex-col border-r border-[#E2E8F0] lg:w-96 lg:min-w-[320px] ${
                selectedThreadId ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Search */}
              <div className="border-b border-[#E2E8F0] p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    placeholder="Search messages…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full pl-9 border-[#E2E8F0] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              {/* Thread list */}
              <div className="flex-1 overflow-y-auto">
                {filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Mail className="mb-3 h-8 w-8 text-[#94A3B8]" />
                    <p className="text-sm font-medium text-[#0F172A]">No messages found</p>
                    <p className="mt-1 text-xs text-[#64748B]">Try adjusting your search.</p>
                  </div>
                ) : (
                  filteredThreads.map((thread, i) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] ${
                        selectedThreadId === thread.id ? "bg-[#F1F5F9]" : ""
                      } ${i > 0 ? "border-t border-[#E2E8F0]" : ""}`}
                    >
                      {/* Unread dot */}
                      <div className="relative mt-1">
                        {thread.unread && (
                          <span className="absolute -left-1 -top-1 z-10 flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6366F1] opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#6366F1]" />
                          </span>
                        )}
                        <Avatar size="default">
                          <AvatarFallback className="bg-[#6366F1]/10 text-[#6366F1] text-xs">
                            {getInitials(thread.participants[0].name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              thread.unread
                                ? "font-semibold text-[#0F172A]"
                                : "font-medium text-[#0F172A]"
                            }`}
                          >
                            {thread.participants[0].name}
                          </p>
                          <span className="shrink-0 text-[11px] text-[#94A3B8]">
                            {formatRelativeTime(thread.lastMessageAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-[#334155]">
                          {thread.subject}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#64748B]">
                          {thread.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right panel — Messages */}
            <div
              className={`flex flex-1 flex-col ${
                selectedThreadId ? "flex" : "hidden lg:flex"
              }`}
            >
              {selectedThread ? (
                <>
                  {/* Thread header */}
                  <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-5 py-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="lg:hidden"
                      onClick={() => setSelectedThreadId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar size="sm">
                      <AvatarFallback className="bg-[#6366F1]/10 text-[#6366F1] text-[10px]">
                        {getInitials(selectedThread.participants[0].name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">
                        {selectedThread.subject}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {selectedThread.participants.map((p) => p.name).join(", ")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4 text-[#64748B]" />
                    </Button>
                  </div>

                  {/* Messages area */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.sender === "You";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[75%] space-y-1.5`}>
                              {/* Sender name + time */}
                              <div
                                className={`flex items-center gap-2 ${
                                  isMe ? "justify-end" : ""
                                }`}
                              >
                                {!isMe && (
                                  <span className="text-xs font-medium text-[#0F172A]">
                                    {msg.sender}
                                  </span>
                                )}
                                <span className="text-[11px] text-[#94A3B8]">
                                  {formatMessageTime(msg.timestamp)}
                                </span>
                                {isMe && (
                                  <span className="text-xs font-medium text-[#6366F1]">
                                    You
                                  </span>
                                )}
                              </div>

                              {/* Bubble */}
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                  isMe
                                    ? "rounded-br-md bg-[#6366F1] text-white"
                                    : "rounded-bl-md bg-[#F1F5F9] text-[#0F172A]"
                                }`}
                              >
                                {msg.body}
                              </div>

                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {msg.attachments.map((att) => (
                                    <a
                                      key={att.name}
                                      href={att.url}
                                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:bg-[#F8FAFC] ${
                                        isMe
                                          ? "border-[#818CF8] bg-[#6366F1]/10 text-[#6366F1]"
                                          : "border-[#E2E8F0] text-[#334155]"
                                      }`}
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span className="font-medium">{att.name}</span>
                                      <span className="text-[#94A3B8]">
                                        ({formatFileSize(att.size)})
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reply area */}
                  <div className="border-t border-[#E2E8F0] p-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Textarea
                          placeholder="Type your reply…"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          className="min-h-[44px] resize-none border-[#E2E8F0] bg-[#F8FAFC] text-sm"
                          rows={1}
                        />
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={!replyText.trim()}
                        className="h-[44px] bg-[#6366F1] px-4 text-white hover:bg-[#5558E6] disabled:opacity-50"
                      >
                        <Send className="mr-1.5 h-4 w-4" />
                        Send
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                    <MailOpen className="h-8 w-8 text-[#94A3B8]" />
                  </div>
                  <p className="text-lg font-medium text-[#0F172A]">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Choose a thread from the left to view messages.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
