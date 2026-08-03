"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadFile } from "@/lib/storage";

interface AccommodationRequest {
  id: string;
  student_id: string;
  telegram_user_id: number;
  message: string | null;
  photo_file_id: string | null;
  video_file_id: string | null;
  status: string;
  admin_reply: string | null;
  admin_reply_photo: string | null;
  admin_reply_video: string | null;
  replied_at: string | null;
  created_at: string;
  student?: { name: string; roll_number: string; college?: { name: string } };
}

export default function AccommodationHelpPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<AccommodationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");
  const [replyingTo, setReplyingTo] = useState<AccommodationRequest | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<{ url: string; type: "photo" | "video" } | null>(null);
  const [loadingAttachment, setLoadingAttachment] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("accommodation-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accommodation_requests" },
        () => fetchRequests(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accommodation_requests")
      .select("*, student:students(name, roll_number, college:colleges(name))")
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        alert("Please select an image or video file");
        return;
      }
      setReplyFile(file);
    }
  };

  const handleReply = async () => {
    if (!replyingTo || (!replyText.trim() && !replyFile)) return;
    setSending(true);

    const { data: userData } = await supabase.auth.getUser();

    let photoUrl: string | undefined;
    let videoUrl: string | undefined;

    // Upload file if selected
    if (replyFile) {
      const result = await uploadFile(replyFile, "accommodation");
      if (result.success && result.publicUrl) {
        if (replyFile.type.startsWith("image/")) {
          photoUrl = result.publicUrl;
        } else {
          videoUrl = result.publicUrl;
        }
      }
    }

    // Update the request with reply
    await supabase
      .from("accommodation_requests")
      .update({
        admin_reply: replyText || null,
        admin_reply_photo: photoUrl || null,
        admin_reply_video: videoUrl || null,
        status: "Replied",
        replied_by: userData.user?.id,
        replied_at: new Date().toISOString(),
      })
      .eq("id", replyingTo.id);

    // Send reply to student via Telegram
    await supabase.functions.invoke("send-support-reply", {
      body: {
        telegramUserId: replyingTo.telegram_user_id,
        replyText: replyText || "See attached",
        message: `🏠 *Accommodation Help Reply*\n\n${replyText || "See attached"}`,
        photoUrl,
        videoUrl,
      },
    });

    setSending(false);
    setReplyingTo(null);
    setReplyText("");
    setReplyFile(null);
    fetchRequests();
  };

  const handleClose = async (id: string) => {
    await supabase
      .from("accommodation_requests")
      .update({ status: "Closed" })
      .eq("id", id);
    fetchRequests();
  };

  const viewAttachment = async (fileId: string, type: "photo" | "video") => {
    setLoadingAttachment(fileId);
    try {
      const { data, error } = await supabase.functions.invoke("get-telegram-file", {
        body: { fileId },
      });

      if (error || !data?.success) {
        alert("Failed to load attachment. The file may have expired on Telegram servers.");
        return;
      }

      setViewingAttachment({ url: data.fileUrl, type });
    } catch {
      alert("Failed to load attachment.");
    } finally {
      setLoadingAttachment(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (activeTab === "open") return r.status === "Open";
    if (activeTab === "replied") return r.status === "Replied";
    if (activeTab === "closed") return r.status === "Closed";
    return true;
  });

  const openCount = requests.filter((r) => r.status === "Open").length;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Accommodation Help
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and reply to student accommodation requests
          </p>
        </div>
        {openCount > 0 && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 border px-3 py-1.5">
            {openCount} Open
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="open" className="relative">
            Open
            {openCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {openCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="replied">Replied</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No {activeTab === "all" ? "" : activeTab} requests
              </div>
            ) : (
              filtered.map((req) => (
                <Card key={req.id} className="border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-slate-900">
                            {req.student?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {req.student?.roll_number}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white border-slate-200"
                          >
                            {req.student?.college?.name || "N/A"}
                          </Badge>
                          <Badge
                            className={`font-normal border ${
                              req.status === "Open"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : req.status === "Replied"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-700 mb-2">
                          {req.message}
                        </p>

                        {(req.photo_file_id || req.video_file_id) && (
                          <div className="flex items-center gap-3 mb-2">
                            {req.photo_file_id && (
                              <button
                                onClick={() => viewAttachment(req.photo_file_id!, "photo")}
                                disabled={loadingAttachment === req.photo_file_id}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                              >
                                {loadingAttachment === req.photo_file_id ? "Loading..." : "\ud83d\udcf7 View photo"}
                              </button>
                            )}
                            {req.video_file_id && (
                              <button
                                onClick={() => viewAttachment(req.video_file_id!, "video")}
                                disabled={loadingAttachment === req.video_file_id}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                              >
                                {loadingAttachment === req.video_file_id ? "Loading..." : "\ud83c\udfa5 View video"}
                              </button>
                            )}
                          </div>
                        )}

                        {req.admin_reply && (
                          <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-xs font-semibold text-emerald-600 mb-1">
                              Admin Reply:
                            </p>
                            <p className="text-sm text-emerald-800">
                              {req.admin_reply}
                            </p>
                            {req.admin_reply_photo && (
                              <a href={req.admin_reply_photo} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                                📸 View attached photo
                              </a>
                            )}
                            {req.admin_reply_video && (
                              <a href={req.admin_reply_video} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                                🎥 View attached video
                              </a>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {req.status === "Open" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setReplyingTo(req);
                              setReplyText("");
                              setReplyFile(null);
                            }}
                            className="bg-slate-900 hover:bg-slate-800"
                          >
                            Reply
                          </Button>
                        )}
                        {req.status !== "Closed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClose(req.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Attachment Viewer Modal */}
      <Dialog
        open={!!viewingAttachment}
        onOpenChange={(open) => !open && setViewingAttachment(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {viewingAttachment?.type === "photo" ? "Photo" : "Video"} Attachment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {viewingAttachment?.type === "photo" ? (
              <img
                src={viewingAttachment.url}
                alt="Student attachment"
                className="w-full rounded-lg border border-slate-200"
              />
            ) : viewingAttachment?.type === "video" ? (
              <video
                src={viewingAttachment.url}
                controls
                className="w-full rounded-lg border border-slate-200"
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingAttachment(null)}>
              Close
            </Button>
            {viewingAttachment?.url && (
              <a href={viewingAttachment.url} target="_blank" rel="noreferrer">
                <Button className="bg-slate-900 hover:bg-slate-800">
                  Open in New Tab
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Modal */}
      <Dialog
        open={!!replyingTo}
        onOpenChange={(open) => !open && setReplyingTo(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reply to {replyingTo?.student?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">
                Student&apos;s Message:
              </p>
              <p className="text-sm text-slate-700">{replyingTo?.message}</p>
              {(replyingTo?.photo_file_id || replyingTo?.video_file_id) && (
                <div className="flex items-center gap-3 mt-2">
                  {replyingTo?.photo_file_id && (
                    <button
                      onClick={() => viewAttachment(replyingTo.photo_file_id!, "photo")}
                      disabled={loadingAttachment === replyingTo.photo_file_id}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                    >
                      {loadingAttachment === replyingTo.photo_file_id ? "Loading..." : "\ud83d\udcf7 View photo"}
                    </button>
                  )}
                  {replyingTo?.video_file_id && (
                    <button
                      onClick={() => viewAttachment(replyingTo.video_file_id!, "video")}
                      disabled={loadingAttachment === replyingTo.video_file_id}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                    >
                      {loadingAttachment === replyingTo.video_file_id ? "Loading..." : "\ud83c\udfa5 View video"}
                    </button>
                  )}
                </div>
              )}
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[120px] bg-slate-50 border-slate-200"
            />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-slate-200 text-slate-600"
                >
                  📎 Attach Photo/Video
                </Button>
                {replyFile && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>{replyFile.type.startsWith("image/") ? "📸" : "🎥"} {replyFile.name}</span>
                    <button
                      onClick={() => setReplyFile(null)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingTo(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReply}
              disabled={sending || (!replyText.trim() && !replyFile)}
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
