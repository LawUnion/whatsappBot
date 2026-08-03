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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { useAdminScope } from "@/hooks/useAdminScope";

const PAGE_SIZE = 10;

export default function InternshipsPage() {
  const supabase = createClient();
  const { admin, isSuperAdmin } = useAdminScope();
  const adminRole = admin?.role;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [years, setYears] = useState<any[]>([]);
  const [viewingInternship, setViewingInternship] = useState<any | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newInfo, setNewInfo] = useState("");
  const [newResourceType, setNewResourceType] = useState<"file" | "link">(
    "link",
  );
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTargetColleges, setNewTargetColleges] = useState<number[]>([]);
  const [newTargetYears, setNewTargetYears] = useState<number[]>([1, 2, 3]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [internRes, collegesRes, yearsRes] = await Promise.all([
      supabase
        .from("internships")
        .select("*, admin:admins(name)")
        .order("created_at", { ascending: false }),
      supabase.from("colleges").select("*"),
      supabase.from("years").select("*"),
    ]);

    if (internRes.data) setInternships(internRes.data);
    if (collegesRes.data) {
      setColleges(collegesRes.data);
      setNewTargetColleges(collegesRes.data.map((c: any) => c.id));
    }
    if (yearsRes.data) setYears(yearsRes.data);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!newTitle) return;
    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setIsSubmitting(false);
      return;
    }

    let fileUrl: string | null = null;

    // Handle file upload
    if (newResourceType === "file" && selectedFile) {
      setUploadingFile(true);
      const result = await uploadFile(selectedFile, "internships");
      setUploadingFile(false);

      if (!result.success) {
        toast.error(result.error || "Failed to upload file");
        setIsSubmitting(false);
        return;
      }
      fileUrl = result.publicUrl || null;
    } else if (newResourceType === "link" && newResourceUrl) {
      fileUrl = newResourceUrl;
    }

    const payload: any = {
      title: newTitle,
      info: newInfo || null,
      created_by: userData.user.id,
      approval_status: adminRole === "SUPER_ADMIN" ? "approved" : "pending",
    };

    if (fileUrl) {
      if (newResourceType === "link") {
        payload.apply_url = fileUrl;
      } else {
        payload.file_url = fileUrl;
      }
    }

    // Store target colleges as JSON array
    if (
      newTargetColleges.length > 0 &&
      newTargetColleges.length < colleges.length
    ) {
      payload.target_colleges = newTargetColleges;
    }

    // Store target years
    if (newTargetYears.length > 0 && newTargetYears.length < 3) {
      payload.target_years = newTargetYears;
    }

    const { error } = await supabase.from("internships").insert(payload);

    if (error) {
      toast.error("Error posting internship: " + error.message);
    } else {
      toast.success(isSuperAdmin ? "Internship posted successfully!" : "Internship submitted for approval!");
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewInfo("");
    setNewResourceType("link");
    setNewResourceUrl("");
    setSelectedFile(null);
    setNewTargetColleges(colleges.map((c) => c.id));
    setNewTargetYears([1, 2, 3]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleCollege = (id: number) => {
    setNewTargetColleges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this internship?")) return;
    const { error } = await supabase.from("internships").delete().eq("id", id);
    if (!error) {
      fetchData();
    } else {
      alert("Error deleting internship");
    }
  };

  const filteredInternships = useMemo(() => {
    let filtered = [...internships];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title?.toLowerCase().includes(query) ||
          i.info?.toLowerCase().includes(query),
      );
    }

    // Filter by college
    if (filterCollege !== "all") {
      filtered = filtered.filter((i) => {
        if (!i.target_colleges) return true; // Faculty-wide
        return i.target_colleges.includes(parseInt(filterCollege));
      });
    }

    // Filter by year
    if (filterYear !== "all") {
      filtered = filtered.filter((i) => {
        if (!i.target_years) return true; // All years
        return i.target_years.includes(parseInt(filterYear));
      });
    }

    return filtered;
  }, [internships, filterCollege, filterYear, searchQuery]);

  // Paginated internships for display
  const displayedInternships = useMemo(() => {
    return filteredInternships.slice(0, displayCount);
  }, [filteredInternships, displayCount]);

  const hasMore = displayCount < filteredInternships.length;

  const loadMore = () => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  };

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, filterCollege, filterYear]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Internship Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Post and manage placement opportunities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                <span className="mr-2">+</span> Post Internship
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Post New Internship</DialogTitle>
                <p className="text-sm text-slate-500">
                  Visible to students based on target colleges and years
                </p>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Title *
                  </label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Internship/Opportunity title"
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Info
                  </label>
                  <Textarea
                    value={newInfo}
                    onChange={(e) => setNewInfo(e.target.value)}
                    placeholder="Additional details about the opportunity..."
                    className="bg-slate-50 border-slate-200 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Resource Type
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setNewResourceType("file")}
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
                      onClick={() => setNewResourceType("link")}
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

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {newResourceType === "file" ? "Attachment" : "Apply Link"}
                  </label>
                  {newResourceType === "link" ? (
                    <Input
                      value={newResourceUrl}
                      onChange={(e) => setNewResourceUrl(e.target.value)}
                      placeholder="https://..."
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
                        className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 cursor-pointer transition-all"
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xl">
                              {selectedFile.type === "application/pdf"
                                ? "📕"
                                : "🖼️"}
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                              {selectedFile.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="text-xl mb-1 block">📄</span>
                            <span className="text-xs font-semibold text-slate-400 uppercase">
                              Drop PDF/Image or Click
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Target Colleges
                  </label>
                  <div className="flex gap-2">
                    {colleges.map((c) => (
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
                  <p className="text-xs text-slate-400 text-center">
                    Select all for faculty-wide visibility
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Target Years
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setNewTargetYears((prev: number[]) =>
                            prev.includes(yr) ? prev.filter((y: number) => y !== yr) : [...prev, yr],
                          );
                        }}
                        className={`flex-1 py-2.5 text-xs font-semibold border rounded-lg transition-all ${
                          newTargetYears.includes(yr)
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {yr === 1 ? "1st" : yr === 2 ? "2nd" : "3rd"} Year
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    Select all for all years
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || uploadingFile}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  {uploadingFile
                    ? "Uploading file..."
                    : isSubmitting
                      ? "Posting..."
                      : "Publish Internship"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex gap-2">
        {["all", "1", "2", "3"].map((yr) => (
          <button
            key={yr}
            onClick={() => setFilterYear(yr)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
              filterYear === yr
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {yr === "all" ? "All Years" : yr === "1" ? "1st Year" : yr === "2" ? "2nd Year" : "3rd Year"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search internships..."
          className="max-w-sm bg-white border-slate-200"
        />
        <Select value={filterCollege} onValueChange={setFilterCollege}>
          <SelectTrigger className="w-[180px] bg-white border-slate-200">
            <SelectValue placeholder="All Colleges" />
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
        {(searchQuery || filterCollege !== "all" || filterYear !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterCollege("all");
              setFilterYear("all");
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-500">
        Showing {displayedInternships.length} of {filteredInternships.length}{" "}
        internships
        {(searchQuery || filterCollege !== "all" || filterYear !== "all") && (
          <span className="ml-1">(filtered)</span>
        )}
      </div>

      {/* Internships Grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            Loading internships...
          </div>
        ) : displayedInternships.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {searchQuery || filterCollege !== "all" || filterYear !== "all"
              ? "No internships match your filters"
              : "No internships found"}
          </div>
        ) : (
          displayedInternships.map((intern) => (
            <Card
              key={intern.id}
              className="border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl border border-slate-200">
                        💼
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">
                          {intern.title}
                        </h3>
                        {intern.info && (
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                            {intern.info}
                          </p>
                        )}
                        {intern.admin?.name && (
                          <p className="text-xs text-slate-400 mt-1">
                            Posted by: {intern.admin.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Target Colleges */}
                    <div className="flex gap-1">
                      {intern.target_colleges ? (
                        intern.target_colleges.map((cid: number) => {
                          const college = colleges.find((c) => c.id === cid);
                          return college ? (
                            <Badge
                              key={cid}
                              variant="outline"
                              className="text-[10px] font-semibold bg-white border-slate-200"
                            >
                              {college.code}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-white border-slate-200"
                        >
                          All
                        </Badge>
                      )}
                    </div>

                    {/* Target Years */}
                    {intern.target_years && (
                      <div className="flex gap-1">
                        {intern.target_years.map((yr: number) => (
                          <Badge
                            key={yr}
                            variant="outline"
                            className="text-[10px] font-semibold bg-blue-50 text-blue-600 border-blue-200"
                          >
                            {yr === 1 ? "1st" : yr === 2 ? "2nd" : "3rd"} Yr
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => setViewingInternship(intern)}
                      >
                        View
                      </Button>
                      {(intern.apply_url || intern.file_url) && (
                        <a
                          href={intern.apply_url || intern.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all"
                        >
                          {intern.file_url ? "File" : "Apply"}
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(intern.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Load More ({filteredInternships.length - displayCount} remaining)
          </Button>
        </div>
      )}

      {/* View Internship Detail Dialog */}
      <Dialog
        open={!!viewingInternship}
        onOpenChange={(open) => {
          if (!open) setViewingInternship(null);
        }}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{viewingInternship?.title}</DialogTitle>
          </DialogHeader>
          {viewingInternship && (
            <div className="space-y-4 mt-4">
              {/* Info */}
              {viewingInternship.info && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Info
                  </label>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
                    {viewingInternship.info}
                  </p>
                </div>
              )}

              {/* Apply URL */}
              {viewingInternship.apply_url && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Apply Link
                  </label>
                  <a
                    href={viewingInternship.apply_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline block truncate"
                  >
                    {viewingInternship.apply_url}
                  </a>
                </div>
              )}

              {/* File URL */}
              {viewingInternship.file_url && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Attachment
                  </label>
                  <a
                    href={viewingInternship.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline block truncate"
                  >
                    {viewingInternship.file_url}
                  </a>
                </div>
              )}

              {/* Target Colleges */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Target Colleges
                </label>
                <div className="flex gap-2 flex-wrap">
                  {viewingInternship.target_colleges ? (
                    viewingInternship.target_colleges.map((cid: number) => {
                      const college = colleges.find((c) => c.id === cid);
                      return college ? (
                        <Badge
                          key={cid}
                          variant="outline"
                          className="text-xs font-semibold bg-white border-slate-200"
                        >
                          {college.code}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold bg-white border-slate-200"
                    >
                      All Colleges
                    </Badge>
                  )}
                </div>
              </div>

              {/* Target Years */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Target Years
                </label>
                <div className="flex gap-2 flex-wrap">
                  {viewingInternship.target_years ? (
                    viewingInternship.target_years.map((yr: number) => (
                      <Badge
                        key={yr}
                        variant="outline"
                        className="text-xs font-semibold bg-blue-50 text-blue-600 border-blue-200"
                      >
                        {yr === 1 ? "1st" : yr === 2 ? "2nd" : "3rd"} Year
                      </Badge>
                    ))
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold bg-blue-50 text-blue-600 border-blue-200"
                    >
                      All Years
                    </Badge>
                  )}
                </div>
              </div>

              {/* Approval Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Approval Status
                </label>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    viewingInternship.approval_status === "approved"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : viewingInternship.approval_status === "rejected"
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                  }`}
                >
                  {viewingInternship.approval_status ?? "pending"}
                </Badge>
              </div>

              {/* Created At & Posted By */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400">
                  Created: {new Date(viewingInternship.created_at).toLocaleString()}
                </span>
                {viewingInternship.admin?.name && (
                  <span className="text-xs text-slate-400">
                    By: {viewingInternship.admin.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
