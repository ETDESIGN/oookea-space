"use client";

import { useState } from "react";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");

  const threads = useQuery(api.projects.listThreads, {});
  const messages = useQuery(
    api.projects.getThreadMessages,
    selected ? { threadId: selected as Id<"threads"> } : "skip"
  );
  const sendMessage = useMutation(api.projects.sendMessage);

  if (user?.role !== "admin") {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Access denied.</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const activeConvo = threads?.find((t) => t._id === selected);
  const filtered = threads?.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      (t as any).clientId?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleReply = async () => {
    if (!reply.trim() || !selected || !user) return;
    await sendMessage({
      threadId: selected as Id<"threads">,
      body: reply,
      senderId: user.id as Id<"users">,
      senderRole: "admin",
    });
    setReply("");
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Messages</h1>
            <p className="mt-1 text-muted-foreground">Manage all client conversations in one place.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 h-[calc(100vh-220px)]">
            {/* Conversation List */}
            <Card className="border-border overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 border-border"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(filtered ?? []).length === 0 && (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">
                      {threads === undefined ? "Loading…" : "No conversations yet"}
                    </p>
                  </div>
                )}
                {(filtered ?? []).map((thread) => (
                  <button
                    key={thread._id}
                    onClick={() => setSelected(thread._id)}
                    className={`w-full text-left px-4 py-3 transition-colors border-b border-border last:border-0 ${
                      selected === thread._id ? "bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                          {thread.subject.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{thread.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(thread.lastMessageAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Message Thread */}
            <Card className="border-border lg:col-span-2 flex flex-col overflow-hidden">
              {activeConvo ? (
                <>
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                        {activeConvo.subject.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{activeConvo.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(activeConvo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages === undefined && (
                      <div className="flex items-center justify-center py-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-border border-t-primary" />
                      </div>
                    )}
                    {(messages ?? []).map((msg) => (
                      <div
                        key={msg._id}
                        className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            msg.senderRole === "admin"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              msg.senderRole === "admin" ? "opacity-60" : "text-muted-foreground"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {messages && messages.length === 0 && (
                      <div className="flex items-center justify-center py-10">
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border p-4">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Type your reply…"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                        className="border-border"
                      />
                      <Button onClick={handleReply} className="shrink-0 bg-primary hover:bg-primary/90">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-muted-foreground">Select a conversation</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
