"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/storage";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminScope } from "@/hooks/useAdminScope";

// Static SEMESTERS for 3-year LLB program (doesn't change)
const SEMESTERS = [
  { id: 1, name: "Semester 1", year: 1 },
  { id: 2, name: "Semester 2", year: 1 },
  { id: 3, name: "Semester 3", year: 2 },
  { id: 4, name: "Semester 4", year: 2 },
  { id: 5, name: "Semester 5", year: 3 },
  { id: 6, name: "Semester 6", year: 3 },
];

export default function StudyMaterialsPage() {
  const supabase = createClient();
  const {
    admin,
    loading: adminLoading,
    isSuperAdmin,
    collegeId: adminCollegeId,
  } = useAdminScope();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [filterCollege, setFilterCollege] = useState("ALL");
  const [filterSemester, setFilterSemester] = useState("ALL");

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newSemester, setNewSemester] = useState("1");
  const [newResourceType, setNewResourceType] = useState<"file" | "link">(
    "link",
  );
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTargetColleges, setNewTargetColleges] = useState<number[]>([]);
  const [newDescription, setNewDescription] = useState("");

  // Set initial values based on admin scope
  useEffect(() => {
    if (!adminLoading && admin && adminCollegeId) {
      setFilterCollege(adminCollegeId.toString());
    }
  }, [adminLoading, admin, adminCollegeId]);

  useEffect(() => {
    if (!adminLoading) {
      fetchData();
    }
  }, [adminLoading]);

  const fetchData = async () => {
    setLoading(true);
    const [materialsRes, collegesRes] = await Promise.all([
      supabase
        .from("study_materials")
        .select("*, admin:admins(name)")
        .order("created_at", { ascending: false }),
      supabase.from("colleges").select("*"),
    ]);

    if (materialsRes.data) {
      let filteredMaterials = materialsRes.data;
      // Filter by admin's college scope
      if (adminCollegeId) {
        filteredMaterials = filteredMaterials.filter((m: any) => {
          // Show materials that are for all colleges or include admin's college
          if (!m.target_colleges || m.target_colleges.length === 0) return true;
          return m.target_colleges.includes(adminCollegeId);
        });
      }
      setMaterials(filteredMaterials);
    }
    if (collegesRes.data) {
      setColleges(collegesRes.data);
      // Set target colleges based on admin scope
      if (adminCollegeId) {
        setNewTargetColleges([adminCollegeId]);
      } else {
        setNewTargetColleges(collegesRes.data.map((c: any) => c.id));
      }
    }
    setLoading(false);
  };

  // Filter colleges based on admin scope
  const scopedColleges = useMemo(() => {
    if (isSuperAdmin || !adminCollegeId) return colleges;
    return colleges.filter((c) => c.id === adminCollegeId);
  }, [colleges, isSuperAdmin, adminCollegeId]);

  const toggleCollege = (id: number) => {
    setNewTargetColleges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

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
    if (!newTitle || !newSubject) return;
    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let fileUrl = null;

    // Handle file upload - using permanent storage for study materials
    if (newResourceType === "file" && selectedFile) {
      setUploadingFile(true);
      const result = await uploadFile(selectedFile, "study-materials");
      setUploadingFile(false);

      if (!result.success || !result.publicUrl) {
        toast.error(result.error || "Failed to upload file. Please try again.");
        setIsSubmitting(false);
        return;
      }
      fileUrl = result.publicUrl;
    } else if (newResourceType === "link" && newResourceUrl) {
      fileUrl = newResourceUrl;
    }

    const payload: any = {
      subject: newSubject,
      topic: newTitle,
      description: newDescription || null,
      uploaded_by: userData.user.id,
      semester_num: parseInt(newSemester),
      file_url: fileUrl,
      approval_status: isSuperAdmin ? "approved" : "pending",
    };

    // Store target colleges if not all selected
    if (
      newTargetColleges.length > 0 &&
      newTargetColleges.length < colleges.length
    ) {
      payload.target_colleges = newTargetColleges;
    }

    const { error } = await supabase.from("study_materials").insert(payload);

    if (error) {
      toast.error("Error uploading material: " + error.message);
    } else {
      toast.success(isSuperAdmin ? "Study material uploaded successfully!" : "Study material submitted for approval!");
      fetchData();
      setShowAddModal(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewSubject("");
    setNewSemester("1");
    setNewResourceType("link");
    setNewResourceUrl("");
    setSelectedFile(null);
    setNewTargetColleges(colleges.map((c) => c.id));
    setNewDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    const { error } = await supabase
      .from("study_materials")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Error deleting: " + error.message);
    } else {
      toast.success("Material deleted successfully!");
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Group materials by semester
  const materialsBySemester = useMemo(() => {
    let filtered = materials;

    if (filterCollege !== "ALL") {
      filtered = filtered.filter((m) => {
        if (!m.target_colleges) return true;
        return m.target_colleges.includes(parseInt(filterCollege));
      });
    }

    if (filterSemester !== "ALL") {
      filtered = filtered.filter(
        (m) => m.semester_num === parseInt(filterSemester),
      );
    }

    const grouped: Record<number, any[]> = {};
    SEMESTERS.forEach((s) => {
      grouped[s.id] = [];
    });

    filtered.forEach((m) => {
      const sem = m.semester_num || 1;
      if (!grouped[sem]) grouped[sem] = [];
      grouped[sem].push(m);
    });

    return grouped;
  }, [materials, filterCollege, filterSemester]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Study Materials
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and manage academic resources by semester
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Only show college filter if admin has access to multiple colleges */}
          {scopedColleges.length > 1 && (
            <Select value={filterCollege} onValueChange={setFilterCollege}>
              <SelectTrigger className="w-[140px] bg-white border-slate-200">
                <SelectValue placeholder="College" />
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

          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Semesters</SelectItem>
              {SEMESTERS.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          >
            + Upload Material
          </Button>
        </div>
      </div>

      {/* Materials by Semester */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading materials...
        </div>
      ) : (
        <div className="space-y-6">
          {SEMESTERS.filter(
            (s) =>
              filterSemester === "ALL" || s.id === parseInt(filterSemester),
          ).map((semester) => {
            const semMaterials = materialsBySemester[semester.id] || [];
            return (
              <Card
                key={semester.id}
                className="border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-1">
                      Year {semester.year}
                    </Badge>
                    <span className="font-bold text-slate-800 text-lg">
                      {semester.name}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs text-indigo-600 border-indigo-200 bg-white font-semibold"
                  >
                    {semMaterials.length} resource(s)
                  </Badge>
                </div>
                <CardContent className="p-6">
                  {semMaterials.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {semMaterials.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                                item.file_url?.includes(".pdf")
                                  ? "bg-rose-50 border-rose-100"
                                  : item.file_url?.startsWith("http")
                                    ? "bg-blue-50 border-blue-100"
                                    : "bg-slate-100 border-slate-200"
                              } border`}
                            >
                              {item.file_url?.includes(".pdf") ? "📄" : "🔗"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">
                                {item.topic || item.subject}
                              </p>
                              <p className="text-xs text-slate-400">
                                {item.subject}
                                {item.admin?.name && <> &middot; By: {item.admin.name}</>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.target_colleges &&
                              item.target_colleges.length < colleges.length && (
                                <div className="flex gap-1">
                                  {item.target_colleges
                                    .slice(0, 2)
                                    .map((cid: number) => {
                                      const college = colleges.find(
                                        (c) => c.id === cid,
                                      );
                                      return college ? (
                                        <Badge
                                          key={cid}
                                          variant="outline"
                                          className="text-[9px] bg-white border-slate-200"
                                        >
                                          {college.code}
                                        </Badge>
                                      ) : null;
                                    })}
                                </div>
                              )}
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-indigo-600 hover:bg-indigo-50"
                                >
                                  View
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                      <span className="text-3xl mb-2 block opacity-50">
                        No materials
                      </span>
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                        No materials for {semester.name}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        Upload resources using the button above
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Material Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Study Material</DialogTitle>
            <p className="text-sm text-slate-500">
              Share academic resources with students
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
                placeholder="e.g., Constitution of India - Case Law Compilation"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Subject
                </label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Constitutional Law"
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Semester
                </label>
                <Select value={newSemester} onValueChange={setNewSemester}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Resource Type
              </label>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
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
                  External Link
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {newResourceType === "file" ? "Upload File" : "Resource URL"}
              </label>
              {newResourceType === "link" ? (
                <Input
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="bg-slate-50 border-slate-200"
                />
              ) : (
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
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">
                          {selectedFile.type === "application/pdf"
                            ? "📄"
                            : "🖼️"}
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
                          Click to Upload PDF or Image (Max 10MB)
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Target Colleges - only show if admin has access to multiple colleges */}
            {scopedColleges.length > 1 ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Target Colleges
                </label>
                <div className="flex gap-2">
                  {scopedColleges.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollege(c.id)}
                      className={`flex-1 py-2.5 text-xs font-semibold border rounded-lg transition-all ${
                        newTargetColleges.includes(c.id)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            ) : scopedColleges.length === 1 ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500">Target College:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {scopedColleges[0]?.name}
                </span>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Description (Optional)
              </label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of the material..."
                className="bg-slate-50 border-slate-200 min-h-[60px]"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || uploadingFile || !newTitle || !newSubject
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {uploadingFile
                  ? "Uploading..."
                  : isSubmitting
                    ? "Saving..."
                    : "Publish Material"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
