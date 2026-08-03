"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { useAdminScope } from "@/hooks/useAdminScope";

interface Society {
  id: number;
  name: string;
  slug: string;
  description?: string;
  college_id?: number;
  icon?: string;
  active?: boolean;
  created_at: string;
  college?: { code: string; name: string };
  _count?: { posts: number };
}

interface SocietyPost {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  college_id?: number;
  society_id: number;
  created_at: string;
  admin?: { name: string };
  college?: { code: string; name: string };
}

interface College {
  id: number;
  code: string;
  name: string;
}

// Society type icons
const SOCIETY_ICONS = [
  { icon: "⚖️", label: "Legal/Moot Court" },
  { icon: "🗣️", label: "Debate" },
  { icon: "📰", label: "Media/Journal" },
  { icon: "🎭", label: "Cultural" },
  { icon: "🏃", label: "Sports" },
  { icon: "🤝", label: "Social Service" },
  { icon: "💡", label: "Innovation/Tech" },
  { icon: "📚", label: "Literary" },
  { icon: "🌍", label: "International" },
  { icon: "🏛️", label: "Political" },
  { icon: "🎓", label: "Academic" },
  { icon: "🏢", label: "Other" },
];

export default function SocietiesPage() {
  const supabase = createClient();
  const { isSuperAdmin } = useAdminScope();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [posts, setPosts] = useState<SocietyPost[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSocietyId, setSelectedSocietyId] = useState<number | null>(
    null,
  );
  const [showAddPost, setShowAddPost] = useState(false);
  const [showAddSociety, setShowAddSociety] = useState(false);
  const [editingSociety, setEditingSociety] = useState<Society | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [filterCollege, setFilterCollege] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // New post form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newResourceType, setNewResourceType] = useState<
    "none" | "file" | "link"
  >("none");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newCollegeId, setNewCollegeId] = useState("all");

  // New society form
  const [societyName, setSocietyName] = useState("");
  const [societySlug, setSocietySlug] = useState("");
  const [societyDescription, setSocietyDescription] = useState("");
  const [societyCollegeId, setSocietyCollegeId] = useState("all");
  const [societyIcon, setSocietyIcon] = useState("🏢");
  const [societyActive, setSocietyActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [societiesRes, collegesRes] = await Promise.all([
      supabase
        .from("societies")
        .select("*, college:colleges(code, name)")
        .order("name"),
      supabase.from("colleges").select("*"),
    ]);

    if (societiesRes.data) setSocieties(societiesRes.data);
    if (collegesRes.data) setColleges(collegesRes.data);
    setLoading(false);
  };

  const fetchPosts = async (societyId: number) => {
    const { data } = await supabase
      .from("society_posts")
      .select("*, admin:admins(name), college:colleges(code, name)")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  // Group societies by college
  const societiesByCollege = useMemo(() => {
    const facultyWide = societies.filter((s) => !s.college_id);
    const byCollege: Record<number, Society[]> = {};

    colleges.forEach((c) => {
      byCollege[c.id] = societies.filter((s) => s.college_id === c.id);
    });

    return { facultyWide, byCollege };
  }, [societies, colleges]);

  // Filtered societies
  const filteredSocieties = useMemo(() => {
    if (filterCollege === "ALL") return societies;
    if (filterCollege === "FACULTY")
      return societies.filter((s) => !s.college_id);
    return societies.filter((s) => s.college_id === parseInt(filterCollege));
  }, [societies, filterCollege]);

  const selectedSociety = useMemo(
    () => societies.find((s) => s.id === selectedSocietyId),
    [societies, selectedSocietyId],
  );

  const handleSelectSociety = (id: number) => {
    setSelectedSocietyId(id);
    fetchPosts(id);
  };

  const openAddSocietyModal = () => {
    setEditingSociety(null);
    setSocietyName("");
    setSocietySlug("");
    setSocietyDescription("");
    setSocietyCollegeId("all");
    setSocietyIcon("🏢");
    setSocietyActive(true);
    setShowAddSociety(true);
  };

  const openEditSocietyModal = (society: Society) => {
    setEditingSociety(society);
    setSocietyName(society.name);
    setSocietySlug(society.slug);
    setSocietyDescription(society.description || "");
    setSocietyCollegeId(society.college_id?.toString() || "all");
    setSocietyIcon(society.icon || "🏢");
    setSocietyActive(society.active !== false);
    setShowAddSociety(true);
  };

  const handleSaveSociety = async () => {
    if (!societyName || !societySlug) return;
    setIsSubmitting(true);

    const payload: any = {
      name: societyName,
      slug: societySlug.toLowerCase().replace(/\s+/g, "-"),
      description: societyDescription || null,
      icon: societyIcon,
      active: societyActive,
      college_id:
        societyCollegeId !== "all" ? parseInt(societyCollegeId) : null,
    };

    if (editingSociety) {
      const { error } = await supabase
        .from("societies")
        .update(payload)
        .eq("id", editingSociety.id);

      if (error) {
        toast.error("Error updating society: " + error.message);
      } else {
        toast.success("Society updated!");
        fetchData();
        setShowAddSociety(false);
      }
    } else {
      const { error } = await supabase.from("societies").insert(payload);

      if (error) {
        if (error.code === "23505") {
          toast.error("A society with this slug already exists");
        } else {
          toast.error("Error creating society: " + error.message);
        }
      } else {
        toast.success("Society created!");
        fetchData();
        setShowAddSociety(false);
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteSociety = async (id: number) => {
    if (!confirm("Delete this society? All posts will also be deleted."))
      return;

    const { error } = await supabase.from("societies").delete().eq("id", id);

    if (error) {
      toast.error("Error deleting society: " + error.message);
    } else {
      toast.success("Society deleted");
      fetchData();
      if (selectedSocietyId === id) {
        setSelectedSocietyId(null);
        setPosts([]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setNewResourceUrl("");
    }
  };

  const handleAddPost = async () => {
    if (!newTitle || !selectedSocietyId) return;
    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let fileUrl = null;

    if (newResourceType === "file" && selectedFile) {
      setUploadingFile(true);
      const result = await uploadFile(selectedFile, "societies");
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
      description: newDescription || null,
      society_id: selectedSocietyId,
      posted_by: userData.user.id,
      file_url: fileUrl,
      college_id: newCollegeId !== "all" ? parseInt(newCollegeId) : null,
      approval_status: isSuperAdmin ? "approved" : "pending",
    };

    const { error } = await supabase.from("society_posts").insert(payload);

    if (!error) {
      toast.success(isSuperAdmin ? "Post added!" : "Post submitted for approval!");
      fetchPosts(selectedSocietyId);
      setShowAddPost(false);
      resetPostForm();
    } else {
      toast.error("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const resetPostForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewResourceType("none");
    setNewResourceUrl("");
    setSelectedFile(null);
    setNewCollegeId("all");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("society_posts").delete().eq("id", id);
    if (selectedSocietyId) fetchPosts(selectedSocietyId);
    toast.success("Post deleted");
  };

  const handleNameChange = (name: string) => {
    setSocietyName(name);
    if (!editingSociety) {
      setSocietySlug(
        name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      );
    }
  };

  // Stats
  const totalSocieties = societies.length;
  const activeSocieties = societies.filter((s) => s.active !== false).length;
  const facultyWideSocieties = societies.filter((s) => !s.college_id).length;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Faculty Societies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage society announcements and updates
          </p>
        </div>

        <div className="flex gap-2">
          {!selectedSocietyId && (
            <Button
              onClick={openAddSocietyModal}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              + Add Society
            </Button>
          )}
          {selectedSocietyId && (
            <Button
              onClick={() => setShowAddPost(true)}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              + Add Update
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading societies...
        </div>
      ) : !selectedSocietyId ? (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                  Total
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {totalSocieties}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Total Societies
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-lg text-emerald-600">
                  Active
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {activeSocieties}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Active
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-lg text-indigo-600">
                  Faculty
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {facultyWideSocieties}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    Faculty-Wide
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-lg text-amber-600">
                  College
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {totalSocieties - facultyWideSocieties}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    College-Specific
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterCollege("ALL")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  filterCollege === "ALL"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCollege("FACULTY")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  filterCollege === "FACULTY"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                Faculty-Wide
              </button>
              {colleges.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCollege(c.id.toString())}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filterCollege === c.id.toString()
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          {/* Societies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSocieties.map((soc) => (
              <Card
                key={soc.id}
                className={`border-slate-200 shadow-sm hover:shadow-lg transition-all group relative ${
                  soc.active === false ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-6">
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex gap-1">
                    {soc.active === false && (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-slate-100 text-slate-500"
                      >
                        Inactive
                      </Badge>
                    )}
                  </div>

                  {/* Edit/Delete on hover */}
                  <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditSocietyModal(soc);
                      }}
                      className="h-7 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white/90 hover:bg-white rounded-md border border-slate-200 shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSociety(soc.id);
                      }}
                      className="h-7 px-2 text-xs font-medium text-slate-500 hover:text-red-600 bg-white/90 hover:bg-white rounded-md border border-slate-200 shadow-sm"
                    >
                      Delete
                    </button>
                  </div>

                  <div
                    onClick={() => handleSelectSociety(soc.id)}
                    className="cursor-pointer"
                  >
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-50 transition-colors border border-slate-200">
                      {soc.icon || "🏢"}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                      {soc.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {soc.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${
                          soc.college_id
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}
                      >
                        {soc.college?.code || "Faculty-Wide"}
                      </Badge>
                      <span className="text-xs text-indigo-600 font-semibold">
                        Manage →
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredSocieties.length === 0 && (
              <div className="col-span-4 text-center py-12 text-slate-400">
                <p className="mb-4">No societies found.</p>
                <Button
                  onClick={openAddSocietyModal}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  Create First Society
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Society Posts View */
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedSocietyId(null);
              setPosts([]);
            }}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span>Back</span>
            <span className="text-sm font-medium">All Societies</span>
          </button>

          {/* Society Info */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl border border-slate-200">
                  {selectedSociety?.icon || "🏢"}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {selectedSociety?.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        selectedSociety?.college_id
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {selectedSociety?.college?.code || "Faculty-Wide"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {selectedSociety?.description || "No description"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  selectedSociety && openEditSocietyModal(selectedSociety)
                }
              >
                Edit Society
              </Button>
            </div>
          </Card>

          {/* Posts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Recent Updates ({posts.length})
              </h3>
              <Select value={filterCollege} onValueChange={setFilterCollege}>
                <SelectTrigger className="w-[160px] bg-white border-slate-200">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Colleges</SelectItem>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {posts.length === 0 ? (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400">
                  No updates posted yet for this society
                </CardContent>
              </Card>
            ) : (
              posts
                .filter(
                  (p) =>
                    filterCollege === "ALL" ||
                    !p.college_id ||
                    p.college_id === parseInt(filterCollege),
                )
                .map((post) => (
                  <Card
                    key={post.id}
                    className="border-slate-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-white border-slate-200"
                            >
                              {post.college?.code || "All Colleges"}
                            </Badge>
                            <span className="text-[10px] text-slate-400">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-900 mb-1">
                            {post.title}
                          </h4>
                          {post.description && (
                            <p className="text-sm text-slate-500 line-clamp-2">
                              {post.description}
                            </p>
                          )}
                          {post.admin?.name && (
                            <p className="text-xs text-slate-400 mt-2">
                              By: {post.admin.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {post.file_url && (
                            <a
                              href={post.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                {post.file_url.includes(".pdf")
                                  ? "PDF"
                                  : "Link"}
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Society Modal */}
      <Dialog open={showAddSociety} onOpenChange={setShowAddSociety}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSociety ? "Edit Society" : "Add New Society"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {SOCIETY_ICONS.map((item) => (
                  <button
                    key={item.icon}
                    type="button"
                    onClick={() => setSocietyIcon(item.icon)}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl transition-all ${
                      societyIcon === item.icon
                        ? "bg-slate-900 border-slate-900"
                        : "bg-white border-slate-200 hover:border-slate-400"
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Society Name</Label>
              <Input
                value={societyName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Debate & Discussion Society"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug (URL-friendly)</Label>
              <Input
                value={societySlug}
                onChange={(e) =>
                  setSocietySlug(
                    e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  )
                }
                placeholder="e.g., debate-society"
                className="bg-slate-50 border-slate-200 font-mono text-sm"
                disabled={!!editingSociety}
              />
              <p className="text-xs text-slate-400">
                Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={societyDescription}
                onChange={(e) => setSocietyDescription(e.target.value)}
                placeholder="Brief description..."
                className="bg-slate-50 border-slate-200 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={societyCollegeId}
                onValueChange={setSocietyCollegeId}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Faculty-Wide (All Colleges)
                  </SelectItem>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div>
                <p className="font-medium text-slate-900 text-sm">Active</p>
                <p className="text-xs text-slate-500">
                  Show this society to students
                </p>
              </div>
              <input
                type="checkbox"
                checked={societyActive}
                onChange={(e) => setSocietyActive(e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSociety(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSociety}
              disabled={isSubmitting || !societyName || !societySlug}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isSubmitting
                ? "Saving..."
                : editingSociety
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Post Modal */}
      <Dialog open={showAddPost} onOpenChange={setShowAddPost}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Society Update</DialogTitle>
            <p className="text-sm text-slate-500">
              Post to {selectedSociety?.name}
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Update title"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Details..."
                className="bg-slate-50 border-slate-200 min-h-[80px]"
              />
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <Label>Attachment (Optional)</Label>
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
                  File
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

            {newResourceType === "file" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 cursor-pointer transition-all"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        {selectedFile.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Click to upload (Max 10MB)
                    </span>
                  )}
                </div>
              </>
            )}

            {newResourceType === "link" && (
              <Input
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-50 border-slate-200"
              />
            )}

            <div className="space-y-2">
              <Label>Target College</Label>
              <Select value={newCollegeId} onValueChange={setNewCollegeId}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddPost(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPost}
                disabled={isSubmitting || uploadingFile || !newTitle}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {uploadingFile
                  ? "Uploading..."
                  : isSubmitting
                    ? "Posting..."
                    : "Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
