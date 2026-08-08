"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { useAdminScope } from "@/hooks/useAdminScope";

export default function NoticesPage() {
  const supabase = createClient();
  const {
    admin,
    loading: adminLoading,
    isSuperAdmin,
    collegeId: adminCollegeId,
  } = useAdminScope();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCollege, setFilterCollege] = useState("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [colleges, setColleges] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // New notice form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetColleges, setNewTargetColleges] = useState<number[]>([]);
  const [newResourceType, setNewResourceType] = useState<
    "none" | "file" | "link"
  >("none");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newIsUrgent, setNewIsUrgent] = useState(false);

  // Set initial values based on admin scope
  useEffect(() => {
    if (!adminLoading && admin && adminCollegeId) {
      setFilterCollege(adminCollegeId.toString());
      setNewTargetColleges([adminCollegeId]);
    } else if (!adminLoading && colleges.length > 0 && newTargetColleges.length === 0) {
      setNewTargetColleges(colleges.map((c) => c.id));
    }
  }, [adminLoading, admin, adminCollegeId, colleges]);

  const toggleCollege = (id: number) => {
    setNewTargetColleges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (!adminLoading) {
      fetchNotices();
      fetchColleges();
    }
  }, [adminLoading]);

  const fetchNotices = async () => {
    setLoading(true);
    let query = supabase
      .from("notices")
      .select("*, college:colleges(code, name), admin:admins(name)")
      .order("created_at", { ascending: false });

    // Filter by admin's college scope
    if (adminCollegeId) {
      query = query.or(`college_id.eq.${adminCollegeId},college_id.is.null`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setNotices(data);
    }
    setLoading(false);
  };

  const fetchColleges = async () => {
    const { data } = await supabase.from("colleges").select("*");
    if (data) setColleges(data);
  };

  // Filter colleges based on admin scope
  const scopedColleges = useMemo(() => {
    if (isSuperAdmin || !adminCollegeId) return colleges;
    return colleges.filter((c) => c.id === adminCollegeId);
  }, [colleges, isSuperAdmin, adminCollegeId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a PDF or image file");
        return;
      }
      // Check file size (max 50MB for permanent storage)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setSelectedFile(file);
      setNewResourceUrl("");
    }
  };

  const handleSubmit = async () => {
    if (!newTitle) return;
    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let fileUrl = null;

    // Handle file upload
    if (newResourceType === "file" && selectedFile) {
      setUploadingFile(true);
      const result = await uploadFile(selectedFile, "notices");
      setUploadingFile(false);

      if (!result.success) {
        toast.error(result.error || "Failed to upload file");
        setIsSubmitting(false);
        return;
      }
      fileUrl = result.publicUrl;
    } else if (newResourceType === "link" && newResourceUrl) {
      fileUrl = newResourceUrl;
    }

    const payload: any = {
      title: newTitle,
      description: newDescription,
      posted_by: userData.user.id,
      is_urgent: newIsUrgent,
      file_url: fileUrl,
      approval_status: isSuperAdmin ? "approved" : "pending",
    };

    if (newTargetColleges.length > 0 && newTargetColleges.length < colleges.length) {
      payload.target_colleges = newTargetColleges;
    }

    const { error } = await supabase.from("notices").insert(payload);

    if (error) {
      toast.error("Error posting notice: " + error.message);
    } else {
      toast.success(isSuperAdmin ? "Notice posted successfully!" : "Notice submitted for approval!");
      fetchNotices();
      setIsDialogOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewTargetColleges(colleges.map((c) => c.id));
    setNewResourceType("none");
    setNewResourceUrl("");
    setSelectedFile(null);
    setNewIsUrgent(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (!error) {
      toast.success("Notice deleted");
      fetchNotices();
    } else {
      toast.error("Error deleting notice");
    }
  };

  const filteredNotices = useMemo(() => {
    let result = notices;

    if (searchQuery) {
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (filterCollege !== "ALL") {
      result = result.filter((n) => n.college_id?.toString() === filterCollege);
    }

    return result;
  }, [notices, searchQuery, filterCollege]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Official Notices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Post and manage faculty announcements
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Only show college filter if admin has access to multiple colleges */}
          {scopedColleges.length > 1 && (
            <Select value={filterCollege} onValueChange={setFilterCollege}>
              <SelectTrigger className="w-[160px] bg-white border-slate-200">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Colleges</SelectItem>
                {scopedColleges.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                + New Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Post New Notice</DialogTitle>
                <p className="text-sm text-slate-500">
                  Will be visible to students based on target scope
                </p>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Title
                  </label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Notice title"
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Description
                  </label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Notice content..."
                    className="min-h-[100px] bg-slate-50 border-slate-200"
                  />
                </div>

                {/* Target Colleges */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Target Colleges
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {scopedColleges.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCollege(c.id)}
                        className={`px-3 py-2.5 flex-1 min-w-[80px] text-xs font-semibold border rounded-lg transition-all ${
                          newTargetColleges.includes(c.id)
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {c.code || c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attachment Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Attachment (Optional)
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setNewResourceType("none");
                        setSelectedFile(null);
                        setNewResourceUrl("");
                      }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                        newResourceType === "none"
                          ? "bg-white shadow-sm text-slate-900"
                          : "text-slate-500"
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewResourceType("file");
                        setNewResourceUrl("");
                      }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                        newResourceType === "file"
                          ? "bg-white shadow-sm text-slate-900"
                          : "text-slate-500"
                      }`}
                    >
                      PDF / Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewResourceType("link");
                        setSelectedFile(null);
                      }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                        newResourceType === "link"
                          ? "bg-white shadow-sm text-slate-900"
                          : "text-slate-500"
                      }`}
                    >
                      Link
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                {newResourceType === "file" && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xl">
                            {selectedFile.type === "application/pdf"
                              ? "PDF"
                              : "IMG"}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-2xl block mb-1">Upload</span>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Click to Upload PDF or Image (Max 50MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Input */}
                {newResourceType === "link" && (
                  <div className="space-y-2">
                    <Input
                      type="url"
                      value={newResourceUrl}
                      onChange={(e) => setNewResourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-100">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      Mark as Urgent
                    </p>
                    <p className="text-xs text-slate-500">
                      This will highlight the notice
                    </p>
                  </div>
                  <Switch
                    checked={newIsUrgent}
                    onCheckedChange={setNewIsUrgent}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || uploadingFile || !newTitle}
                    className="flex-1 bg-slate-900 hover:bg-slate-800"
                  >
                    {uploadingFile
                      ? "Uploading..."
                      : isSubmitting
                        ? "Posting..."
                        : "Publish Notice"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notices..."
          className="max-w-sm bg-white border-slate-200"
        />
      </div>

      {/* Notices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500">
            Loading notices...
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500">
            No notices found
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <Card
              key={notice.id}
              className="border-slate-200 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group rounded-3xl"
            >
              {notice.is_urgent && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                  Urgent
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge
                    variant="outline"
                    className="bg-white text-slate-600 border-slate-200 font-normal text-[10px]"
                  >
                    {notice.college?.code || "Faculty-Wide"}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(notice.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-semibold text-lg text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                  {notice.title}
                </h3>

                <p className="text-sm text-slate-500 line-clamp-3 mb-4">
                  {notice.description || "No description provided"}
                </p>

                {notice.admin?.name && (
                  <p className="text-xs text-slate-400 mb-4">
                    By: <span className="font-medium">{notice.admin.name}</span>
                  </p>
                )}

                <div className="flex gap-2">
                  {notice.file_url && (
                    <a
                      href={notice.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-slate-900 text-white text-center text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all"
                    >
                      {notice.file_url.includes(".pdf")
                        ? "View PDF"
                        : notice.file_url.startsWith("http")
                          ? "Open Link"
                          : "View File"}
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(notice.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
