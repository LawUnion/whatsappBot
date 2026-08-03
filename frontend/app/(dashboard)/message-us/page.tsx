"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SupportMessage {
  id: string;
  message: string;
  read: boolean;
  replied_at: string | null;
  reply_text: string | null;
  created_at: string;
  student: {
    id: string;
    name: string;
    roll_number: string;
    telegram_username: string;
    telegram_user_id: number;
  } | null;
}

export default function MessageUsPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "resolved">("all");

  // Reply modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_messages")
      .select(
        "*, student:students(id, name, roll_number, telegram_username, telegram_user_id)",
      )
      .order("created_at", { ascending: false });

    if (data) setMessages(data);
    if (error) toast.error("Failed to load messages");
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("support_messages")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      toast.error("Failed to mark as resolved");
    } else {
      toast.success("Marked as resolved");
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read: true } : m)),
      );
    }
  };

  const openReplyModal = (msg: SupportMessage) => {
    setSelectedMessage(msg);
    setReplyText("");
    setShowReplyModal(true);
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);

    try {
      // Send message via Telegram using the notify-student edge function
      const { error: sendError } = await supabase.functions.invoke(
        "send-support-reply",
        {
          body: {
            telegramUserId: selectedMessage.student?.telegram_user_id,
            replyText: replyText.trim(),
            originalMessage: selectedMessage.message.substring(0, 100),
          },
        },
      );

      if (sendError) {
        // Fallback: Try direct Telegram link if edge function fails
        const telegramUrl = `https://t.me/${selectedMessage.student?.telegram_username}`;
        window.open(telegramUrl, "_blank");
        toast.info("Opening Telegram to send reply manually");
      }

      // Update the message record with reply
      const { error: updateError } = await supabase
        .from("support_messages")
        .update({
          read: true,
          reply_text: replyText.trim(),
          replied_at: new Date().toISOString(),
        })
        .eq("id", selectedMessage.id);

      if (!updateError) {
        toast.success("Reply sent successfully!");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === selectedMessage.id
              ? {
                  ...m,
                  read: true,
                  reply_text: replyText.trim(),
                  replied_at: new Date().toISOString(),
                }
              : m,
          ),
        );
        setShowReplyModal(false);
        setSelectedMessage(null);
        setReplyText("");
      }
    } catch (err) {
      console.error("Error sending reply:", err);
      toast.error("Failed to send reply. Try opening Telegram directly.");
    }

    setSending(false);
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === "unread") return !msg.read;
    if (filter === "resolved") return msg.read;
    return true;
  });

  const unreadCount = messages.filter((m) => !m.read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          Support Inbox
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
          )}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Incoming student support requests via Telegram bot.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "unread", "resolved"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-slate-900 text-white" : ""}
          >
            {f === "all" ? "All" : f === "unread" ? "Unread" : "Resolved"}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <Card className="rounded-3xl overflow-hidden border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">
                {filter === "unread"
                  ? "No unread messages"
                  : filter === "resolved"
                    ? "No resolved messages"
                    : "Inbox is empty"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-6 hover:bg-slate-50 transition-all ${!msg.read ? "bg-amber-50/50" : ""}`}
                >
                  <div className="flex gap-4">
                    {/* Indicator */}
                    <div
                      className={`w-3 h-3 rounded-full mt-2 shrink-0 ${!msg.read ? "bg-amber-500 animate-pulse" : "bg-slate-200"}`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {msg.student?.name || "Unknown"} •{" "}
                            {msg.student?.roll_number || "No Roll"}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                            {formatDate(msg.created_at)}
                          </h4>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {!msg.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] px-3 py-1 h-auto border-slate-300"
                              onClick={() => markAsRead(msg.id)}
                            >
                              Mark Resolved
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="text-[10px] px-3 py-1 h-auto bg-slate-900 text-white hover:bg-slate-800"
                            onClick={() => openReplyModal(msg)}
                          >
                            Reply
                          </Button>
                          {msg.student?.telegram_username && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] px-3 py-1 h-auto"
                              onClick={() =>
                                window.open(
                                  `https://t.me/${msg.student?.telegram_username}`,
                                  "_blank",
                                )
                              }
                            >
                              Open TG
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>

                      {/* Show reply if exists */}
                      {msg.reply_text && (
                        <div className="mt-3 p-3 bg-slate-100 rounded-lg border-l-4 border-slate-400">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Your Reply •{" "}
                            {msg.replied_at ? formatDate(msg.replied_at) : ""}
                          </p>
                          <p className="text-sm text-slate-600">
                            {msg.reply_text}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reply to Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Original Message */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                From: {selectedMessage?.student?.name || "Unknown"}
              </p>
              <p className="text-sm text-slate-700 line-clamp-3">
                {selectedMessage?.message}
              </p>
            </div>

            {/* Reply Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Your Reply
              </label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                rows={4}
                className="bg-white border-slate-200"
              />
              <p className="text-xs text-slate-400">
                This will be sent to the student via Telegram bot.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplyModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {sending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
