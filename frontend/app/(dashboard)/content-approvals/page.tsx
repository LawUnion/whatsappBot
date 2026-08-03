"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  table: string;
  admin_name?: string;
  approval_status: string;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "notice", label: "Notices" },
  { value: "event", label: "Events" },
  { value: "internship", label: "Internships" },
  { value: "study_material", label: "Study Materials" },
  { value: "society_post", label: "Society Posts" },
];

const TYPE_META: Record<string, { label: string; color: string; table: string }> = {
  notice: { label: "Notice", color: "bg-blue-50 text-blue-700 border-blue-200", table: "notices" },
  event: { label: "Event", color: "bg-purple-50 text-purple-700 border-purple-200", table: "events" },
  internship: { label: "Internship", color: "bg-amber-50 text-amber-700 border-amber-200", table: "internships" },
  study_material: { label: "Study Material", color: "bg-emerald-50 text-emerald-700 border-emerald-200", table: "study_materials" },
  society_post: { label: "Society Post", color: "bg-pink-50 text-pink-700 border-pink-200", table: "society_posts" },
};

export default function ContentApprovalsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // Edit state
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);

    const [noticesRes, eventsRes, internshipsRes, materialsRes, postsRes] =
      await Promise.all([
        supabase
          .from("notices")
          .select("id, title, description, created_at, approval_status, admin:admins!posted_by(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id, title, description, created_at, approval_status, admin:admins!created_by(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("internships")
          .select("id, title, info, created_at, approval_status, admin:admins!created_by(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("study_materials")
          .select("id, subject, topic, created_at, approval_status, admin:admins!uploaded_by(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("society_posts")
          .select("id, title, description, created_at, approval_status, admin:admins!posted_by(name)")
          .order("created_at", { ascending: false }),
      ]);

    const allItems: ContentItem[] = [];

    noticesRes.data?.forEach((n: any) => {
      allItems.push({
        id: n.id,
        title: n.title,
        description: n.description,
        type: "notice",
        table: "notices",
        admin_name: n.admin?.name,
        approval_status: n.approval_status || "approved",
        created_at: n.created_at,
      });
    });

    eventsRes.data?.forEach((e: any) => {
      allItems.push({
        id: e.id,
        title: e.title,
        description: e.description,
        type: "event",
        table: "events",
        admin_name: e.admin?.name,
        approval_status: e.approval_status || "approved",
        created_at: e.created_at,
      });
    });

    internshipsRes.data?.forEach((i: any) => {
      allItems.push({
        id: i.id,
        title: i.title,
        description: i.info,
        type: "internship",
        table: "internships",
        admin_name: i.admin?.name,
        approval_status: i.approval_status || "approved",
        created_at: i.created_at,
      });
    });

    materialsRes.data?.forEach((m: any) => {
      allItems.push({
        id: m.id,
        title: m.topic || m.subject,
        description: m.subject,
        type: "study_material",
        table: "study_materials",
        admin_name: m.admin?.name,
        approval_status: m.approval_status || "approved",
        created_at: m.created_at,
      });
    });

    postsRes.data?.forEach((p: any) => {
      allItems.push({
        id: p.id,
        title: p.title,
        description: p.description,
        type: "society_post",
        table: "society_posts",
        admin_name: p.admin?.name,
        approval_status: p.approval_status || "approved",
        created_at: p.created_at,
      });
    });

    allItems.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setItems(allItems);
    setLoading(false);
  };

  const handleApprove = async (item: ContentItem) => {
    setProcessing(item.id);
    const { error } = await supabase
      .from(item.table)
      .update({ approval_status: "approved" })
      .eq("id", item.id);
    if (error) {
      toast.error("Failed to approve: " + error.message);
    } else {
      toast.success("Content approved");
    }
    setProcessing(null);
    fetchContent();
  };

  const handleReject = async (item: ContentItem) => {
    setProcessing(item.id);
    const { error } = await supabase
      .from(item.table)
      .update({ approval_status: "rejected" })
      .eq("id", item.id);
    if (error) {
      toast.error("Failed to reject: " + error.message);
    } else {
      toast.success("Content rejected");
    }
    setProcessing(null);
    fetchContent();
  };

  const openEdit = (item: ContentItem) => {
    setEditingItem(item);
    setEditTitle(item.title || "");
    setEditDescription(item.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setEditSaving(true);

    const updatePayload: any = {};

    // Map fields back to the correct column names per table
    if (editingItem.type === "internship") {
      updatePayload.title = editTitle;
      updatePayload.info = editDescription;
    } else if (editingItem.type === "study_material") {
      updatePayload.topic = editTitle;
    } else {
      updatePayload.title = editTitle;
      updatePayload.description = editDescription;
    }

    const { error } = await supabase
      .from(editingItem.table)
      .update(updatePayload)
      .eq("id", editingItem.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Content updated");
      setEditingItem(null);
      fetchContent();
    }
    setEditSaving(false);
  };

  const filtered = useMemo(() => {
    let result = items;

    // Filter by status tab
    if (activeTab !== "all") {
      result = result.filter((item) => item.approval_status === activeTab);
    }

    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.admin_name?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [items, activeTab, typeFilter, searchQuery]);

  const pendingCount = items.filter((i) => i.approval_status === "pending").length;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Content Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve content posted by admins before it goes live
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 border px-3 py-1.5">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search content..."
          className="max-w-xs bg-white border-slate-200"
        />
        <div className="flex gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                typeFilter === opt.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(searchQuery || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("all");
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="text-xs text-slate-400 mb-3">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No {activeTab === "all" ? "" : activeTab} content
                {typeFilter !== "all" ? ` for ${TYPE_META[typeFilter]?.label || typeFilter}` : ""}
              </div>
            ) : (
              filtered.map((item) => (
                <Card key={`${item.type}-${item.id}`} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold border ${TYPE_META[item.type]?.color || "bg-slate-50 text-slate-700 border-slate-200"}`}
                          >
                            {TYPE_META[item.type]?.label || item.type}
                          </Badge>
                          <Badge
                            className={`text-[10px] font-normal border ${
                              item.approval_status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : item.approval_status === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {item.approval_status}
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                          {item.admin_name && (
                            <span>By: {item.admin_name}</span>
                          )}
                          <span>
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Edit button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </Button>

                        {/* Approve/Reject */}
                        {item.approval_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(item)}
                              disabled={processing === item.id}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject(item)}
                              disabled={processing === item.id}
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {item.approval_status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(item)}
                            disabled={processing === item.id}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        )}
                        {item.approval_status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(item)}
                            disabled={processing === item.id}
                            className="text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          >
                            Approve
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

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Edit {editingItem ? TYPE_META[editingItem.type]?.label : "Content"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Title
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
            </div>
            {editingItem?.type !== "study_material" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {editingItem?.type === "internship" ? "Info" : "Description"}
                </label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="bg-slate-50 border-slate-200 min-h-[120px]"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
