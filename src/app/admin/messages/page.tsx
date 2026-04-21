"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Search } from "lucide-react";

interface Conversation {
  id: string;
  clientName: string;
  clientEmail: string;
  unread: number;
  messages: { id: string; sender: "admin" | "client"; body: string; timestamp: string }[];
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    clientName: "Sarah Johnson",
    clientEmail: "sarah@techcorp.com",
    unread: 2,
    messages: [
      { id: "m1", sender: "client", body: "Hi! Can we schedule a meeting to discuss the website redesign progress?", timestamp: "2026-04-21T09:00:00Z" },
      { id: "m2", sender: "admin", body: "Of course! How about Thursday at 2pm? I'll also have the mockups ready by then.", timestamp: "2026-04-21T09:30:00Z" },
      { id: "m3", sender: "client", body: "Thursday works perfectly. Looking forward to seeing the mockups!", timestamp: "2026-04-21T10:00:00Z" },
      { id: "m4", sender: "client", body: "Also, I wanted to ask about the AI marketing module — when can we start testing it?", timestamp: "2026-04-21T14:00:00Z" },
    ],
  },
  {
    id: "2",
    clientName: "Marco Rivera",
    clientEmail: "marco@greenleaf.com",
    unread: 0,
    messages: [
      { id: "m5", sender: "admin", body: "Hi Marco, the sourcing report is ready. You can find it in your file vault.", timestamp: "2026-04-20T11:00:00Z" },
      { id: "m6", sender: "client", body: "Thanks! I'll review it today and get back to you with feedback.", timestamp: "2026-04-20T14:00:00Z" },
    ],
  },
  {
    id: "3",
    clientName: "Lisa Chen",
    clientEmail: "lisa@bluewave.io",
    unread: 1,
    messages: [
      { id: "m7", sender: "admin", body: "Lisa, the brand assets have been uploaded. Please review when you get a chance.", timestamp: "2026-04-19T16:00:00Z" },
      { id: "m8", sender: "client", body: "Got it! The logo looks amazing. Quick question — do we have a dark mode version?", timestamp: "2026-04-21T08:00:00Z" },
    ],
  },
  {
    id: "4",
    clientName: "James Park",
    clientEmail: "james@novatech.dev",
    unread: 0,
    messages: [
      { id: "m9", sender: "client", body: "Invoice #INV-2026-005 has been paid. Please confirm receipt.", timestamp: "2026-04-18T10:00:00Z" },
      { id: "m10", sender: "admin", body: "Confirmed! Payment received. Thank you, James.", timestamp: "2026-04-18T10:30:00Z" },
    ],
  },
  {
    id: "5",
    clientName: "Emma Wilson",
    clientEmail: "emma@artisan.co",
    unread: 3,
    messages: [
      { id: "m11", sender: "client", body: "We need to add an e-commerce section to the website. Is that possible within the current scope?", timestamp: "2026-04-19T09:00:00Z" },
      { id: "m12", sender: "admin", body: "We can absolutely add that! I'll prepare a revised scope and quote for you.", timestamp: "2026-04-19T11:00:00Z" },
      { id: "m13", sender: "client", body: "Great! Also, can we integrate Stripe for payments?", timestamp: "2026-04-20T15:00:00Z" },
      { id: "m14", sender: "client", body: "And one more thing — we need the site to support 3 languages.", timestamp: "2026-04-21T07:00:00Z" },
    ],
  },
];

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string>(mockConversations[0].id);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState(mockConversations);

  if (user?.role !== "admin") {
    return <ProtectedRoute><AppLayout><div className="flex items-center justify-center py-20"><p className="text-[#64748B]">Access denied.</p></div></AppLayout></ProtectedRoute>;
  }

  const activeConvo = conversations.find((c) => c.id === selected);
  const filtered = conversations.filter(
    (c) => c.clientName.toLowerCase().includes(search.toLowerCase()) || c.clientEmail.toLowerCase().includes(search.toLowerCase())
  );

  const handleReply = () => {
    if (!reply.trim() || !activeConvo) return;
    setConversations(
      conversations.map((c) =>
        c.id === selected
          ? { ...c, messages: [...c.messages, { id: `m${Date.now()}`, sender: "admin" as const, body: reply, timestamp: new Date().toISOString() }] }
          : c
      )
    );
    setReply("");
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Client Messages</h1>
            <p className="mt-1 text-[#64748B]">Manage all client conversations in one place.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 h-[calc(100vh-220px)]">
            {/* Conversation List */}
            <Card className="border-[#E2E8F0] overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#E2E8F0]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 border-[#E2E8F0]" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filtered.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => setSelected(convo.id)}
                    className={`w-full text-left px-4 py-3 transition-colors border-b border-[#E2E8F0] last:border-0 ${
                      selected === convo.id ? "bg-[#6366F1]/5" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-[#6366F1] text-xs font-bold text-white">
                          {convo.clientName.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#0F172A] truncate">{convo.clientName}</p>
                          {convo.unread > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6366F1] text-[10px] font-bold text-white">
                              {convo.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] truncate">
                          {convo.messages[convo.messages.length - 1]?.body}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Message Thread */}
            <Card className="border-[#E2E8F0] lg:col-span-2 flex flex-col overflow-hidden">
              {activeConvo ? (
                <>
                  {/* Thread Header */}
                  <div className="flex items-center gap-3 border-b border-[#E2E8F0] p-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#6366F1] text-sm font-bold text-white">
                        {activeConvo.clientName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{activeConvo.clientName}</p>
                      <p className="text-xs text-[#64748B]">{activeConvo.clientEmail}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeConvo.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            msg.sender === "admin"
                              ? "bg-[#6366F1] text-white rounded-br-md"
                              : "bg-[#F1F5F9] text-[#0F172A] rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          <p className={`mt-1 text-[10px] ${msg.sender === "admin" ? "text-white/60" : "text-[#94A3B8]"}`}>
                            {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply */}
                  <div className="border-t border-[#E2E8F0] p-4">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Type your reply…"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                        className="border-[#E2E8F0]"
                      />
                      <Button onClick={handleReply} className="shrink-0 bg-[#6366F1] hover:bg-[#4F46E5]">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-[#94A3B8]">Select a conversation</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
