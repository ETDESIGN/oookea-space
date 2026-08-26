"use client";

import { useState, useRef, useEffect } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Search,
  Send,
  Paperclip,
  ArrowLeft,
  MoreVertical,
  Mail,
  MailOpen,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// ─── Helpers ────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";
  const clientId = !isAdmin ? (user?.id as Id<"users">) : undefined;

  const threads = useQuery(
    api.projects.listThreads,
    clientId ? { clientId } : {}
  );

  const selectedThreadMessages = useQuery(
    api.projects.getThreadMessages,
    selectedThreadId ? { threadId: selectedThreadId as Id<"threads"> } : "skip"
  );

  const sendMessage = useMutation(api.projects.sendMessage);
  const logActivity = useMutation(api.projects.logActivity);
  const createThread = useMutation(api.projects.createThread);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedThread = threads?.find((t) => t._id === selectedThreadId);

  const filteredThreads = threads?.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThreadMessages]);

  const handleSend = async () => {
    if (!replyText.trim() || !selectedThreadId) return;
    await sendMessage({
      threadId: selectedThreadId as Id<"threads">,
      body: replyText,
      senderId: user?.id as Id<"users">,
      senderRole: user?.role === "admin" ? "admin" : "client",
    });
    // Keep the dashboard activity feed alive
    await logActivity({
      clientId: selectedThread?.clientId,
      projectId: selectedThread?.projectId,
      type: "comment",
      message: `${selectedThread?.subject ?? "Message"}: new message from ${user?.name ?? "user"}`,
      userId: user?.id as Id<"users"> | undefined,
    }).catch(() => {});
    setReplyText("");
  };

  const handleCreateThread = async () => {
    if (!newSubject.trim() || !user?.id) return;
    setCreating(true);
    try {
      // For clients, their own ID is the thread owner; admins pick a client later in admin views
      const ownerId = user.role === "admin" ? (user.id as Id<"users">) : (user.id as Id<"users">);
      const threadId = await createThread({
        subject: newSubject.trim(),
        clientId: ownerId,
      });
      if (newBody.trim()) {
        await sendMessage({
          threadId: threadId as Id<"threads">,
          body: newBody.trim(),
          senderId: user.id as Id<"users">,
          senderRole: user.role === "admin" ? "admin" : "client",
        });
      }
      setSelectedThreadId(threadId as string);
      setShowNewThread(false);
      setNewSubject("");
      setNewBody("");
    } finally {
      setCreating(false);
    }
  };

  if (threads === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Messages</h1>
              <p className="mt-1 text-muted-foreground">
                Communicate with your team on project updates and deliverables.
              </p>
            </div>
            <Button
              onClick={() => setShowNewThread((v) => !v)}
              className="shrink-0 bg-primary text-white hover:bg-primary/90"
            >
              <Send className="mr-2 h-4 w-4" />
              New message
            </Button>
          </div>

          {/* New thread form */}
          {showNewThread && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Input
                placeholder="Subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="bg-background"
              />
              <Textarea
                placeholder="Write your message…"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={3}
                className="bg-background"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewThread(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newSubject.trim() || creating}
                  onClick={handleCreateThread}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* Two-panel layout */}
          <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-xl border border-border bg-card">
            {/* Left panel — Thread list */}
            <div
              className={`flex w-full flex-col border-r border-border lg:w-96 lg:min-w-[320px] ${
                selectedThreadId ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Search */}
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search messages…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full pl-9 border-border bg-background"
                  />
                </div>
              </div>

              {/* Thread list */}
              <div className="flex-1 overflow-y-auto">
                {filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Mail className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No messages found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search.</p>
                  </div>
                ) : (
                  filteredThreads.map((thread, i) => (
                    <button
                      key={thread._id}
                      onClick={() => setSelectedThreadId(thread._id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-background ${
                        selectedThreadId === thread._id ? "bg-muted" : ""
                      } ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      {/* Unread dot */}
                      <div className="relative mt-1">
                        <Avatar size="default">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(thread.subject.split("—")[0].trim())}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {thread.clientId === user?.id ? "Support" : thread.subject.split("—")[0].trim()}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatRelativeTime(thread.lastMessageAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-[#334155]">
                          {thread.subject}
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
                  <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="lg:hidden"
                      onClick={() => setSelectedThreadId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar size="sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {getInitials(selectedThread.subject.split("—")[0].trim())}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {selectedThread.subject}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Messages area */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-4">
                      {selectedThreadMessages === undefined ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        selectedThreadMessages.map((msg) => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div
                              key={msg._id}
                              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div className="max-w-[75%] space-y-1.5">
                                {/* Sender name + time */}
                                <div
                                  className={`flex items-center gap-2 ${
                                    isMe ? "justify-end" : ""
                                  }`}
                                >
                                  {!isMe && (
                                    <span className="text-xs font-medium text-foreground">
                                      {msg.senderRole === "admin" ? "Admin" : "Client"}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                  {isMe && (
                                    <span className="text-xs font-medium text-primary">
                                      You
                                    </span>
                                  )}
                                </div>

                                {/* Bubble */}
                                <div
                                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    isMe
                                      ? "rounded-br-md bg-primary text-white"
                                      : "rounded-bl-md bg-muted text-foreground"
                                  }`}
                                >
                                  {msg.body}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Reply area */}
                  <div className="border-t border-border p-4">
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
                          className="min-h-[44px] resize-none border-border bg-background text-sm"
                          rows={1}
                        />
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={!replyText.trim()}
                        className="h-[44px] bg-primary px-4 text-white hover:bg-primary/90 disabled:opacity-50"
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
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <MailOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
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
