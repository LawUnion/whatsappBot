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
import { Label } from "@/components/ui/label";
import { useAdminScope } from "@/hooks/useAdminScope";

export default function DailyClassNotesPage() {
  const supabase = createClient();
  const {
    admin,
    loading: adminLoading,
    isSuperAdmin,
    collegeId: adminCollegeId,
    yearId: adminYearId,
    sectionId: adminSectionId,
  } = useAdminScope();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [_semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Filters - initialize based on admin scope
  const [filterCollege, setFilterCollege] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // Form state
  const [newDate, setNewDate] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCollegeId, setNewCollegeId] = useState("");
  const [newYearId, setNewYearId] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const [newResourceType, setNewResourceType] = useState<
    "none" | "file" | "link"
  >("none");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Set initial filters based on admin scope
  useEffect(() => {
    if (!adminLoading && admin) {
      if (adminCollegeId) {
        setFilterCollege(adminCollegeId.toString());
        setNewCollegeId(adminCollegeId.toString());
      }
      if (adminYearId) {
        setFilterYear(adminYearId.toString());
        setNewYearId(adminYearId.toString());
      }
      if (adminSectionId) {
        setFilterSection(adminSectionId.toString());
        setNewSectionId(adminSectionId.toString());
      }
    }
  }, [adminLoading, admin, adminCollegeId, adminYearId, adminSectionId]);

  useEffect(() => {
    if (!adminLoading) {
      fetchData();
    }
  }, [adminLoading]);

  const fetchData = async () => {
    setLoading(true);

    // Build notes query with admin scope filtering
    let notesQuery = supabase
      .from("schedule_notes")
      .select(
        "*, section:sections(name, semester:semesters(year_id, year:years(name, college_id, college:colleges(code)))), admin:admins(name)",
      )
      .order("date", { ascending: false })
      .limit(100);

    // Apply admin scope filters to notes query
    if (adminSectionId) {
      notesQuery = notesQuery.eq("section_id", adminSectionId);
    }

    const [notesRes, collegesRes, yearsRes, semestersRes, sectionsRes] =
      await Promise.all([
        notesQuery,
        supabase.from("colleges").select("*"),
        supabase.from("years").select("*"),
        supabase.from("semesters").select("*"),
        supabase
          .from("sections")
          .select("*, semester:semesters(year_id, year:years(college_id))"),
      ]);

    if (notesRes.data) {
      let filteredNotes = notesRes.data;
      // Additional client-side filtering for college/year scope
      if (adminCollegeId && !adminSectionId) {
        filteredNotes = filteredNotes.filter(
          (n: any) => n.section?.semester?.year?.college_id === adminCollegeId,
        );
      }
      if (adminYearId && !adminSectionId) {
        filteredNotes = filteredNotes.filter(
          (n: any) => n.section?.semester?.year_id === adminYearId,
        );
      }
      setNotes(filteredNotes);
    }
    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (semestersRes.data) setSemesters(semestersRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
    setLoading(false);
  };

  // Filter colleges based on admin scope
  const scopedColleges = useMemo(() => {
    if (isSuperAdmin || !adminCollegeId) return colleges;
    return colleges.filter((c) => c.id === adminCollegeId);
  }, [colleges, isSuperAdmin, adminCollegeId]);

  // Filter years by college (scoped to admin's access)
  const scopedYears = useMemo(() => {
    let filtered = years;
    if (adminCollegeId) {
      filtered = filtered.filter((y) => y.college_id === adminCollegeId);
    }
    if (adminYearId) {
      filtered = filtered.filter((y) => y.id === adminYearId);
    }
    return filtered;
  }, [years, adminCollegeId, adminYearId]);

  // Filter sections (scoped to admin's access)
  const scopedSections = useMemo(() => {
    let filtered = sections;
    if (adminCollegeId) {
      filtered = filtered.filter(
        (s) => s.semester?.year?.college_id === adminCollegeId,
      );
    }
    if (adminYearId) {
      filtered = filtered.filter((s) => s.semester?.year_id === adminYearId);
    }
    if (adminSectionId) {
      filtered = filtered.filter((s) => s.id === adminSectionId);
    }
    return filtered;
  }, [sections, adminCollegeId, adminYearId, adminSectionId]);

  const availableYears = useMemo(
    () =>
      filterCollege && filterCollege !== "ALL"
        ? scopedYears.filter((y) => y.college_id === parseInt(filterCollege))
        : scopedYears,
    [scopedYears, filterCollege],
  );

  // Filter sections by year
  const availableSections = useMemo(
    () =>
      filterYear && filterYear !== "ALL"
        ? scopedSections.filter(
            (s) => s.semester?.year_id === parseInt(filterYear),
          )
        : scopedSections,
    [scopedSections, filterYear],
  );

  // Form years/sections
  const formYears = useMemo(
    () =>
      newCollegeId
        ? scopedYears.filter((y) => y.college_id === parseInt(newCollegeId))
        : [],
    [scopedYears, newCollegeId],
  );

  // Get unique sections by name for the selected year (avoid duplicates from multiple semesters)
  const formSections = useMemo(() => {
    if (!newYearId) return [];

    // If admin is restricted to a section, only show that section
    if (adminSectionId) {
      return scopedSections.filter((s) => s.id === adminSectionId);
    }

    const yearSections = scopedSections.filter(
      (s) => s.semester?.year_id === parseInt(newYearId),
    );

    // Deduplicate by section name, keeping first occurrence
    const seen = new Set<string>();
    return yearSections.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [scopedSections, newYearId, adminSectionId]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (filterSection) {
      result = result.filter((n) => n.section_id === parseInt(filterSection));
    } else if (filterYear) {
      result = result.filter(
        (n) => n.section?.semester?.year_id === parseInt(filterYear),
      );
    } else if (filterCollege) {
      result = result.filter(
        (n) =>
          n.section?.semester?.year?.college_id === parseInt(filterCollege),
      );
    }

    return result;
  }, [notes, filterCollege, filterYear, filterSection]);

  // Group by date
  const notesByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredNotes.forEach((n) => {
      const dateKey = n.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(n);
    });
    return grouped;
  }, [filteredNotes]);

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
        alert("Please select a PDF or image file");
        return;
      }
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setNewResourceUrl("");
    }
  };

  const handleSubmit = async () => {
    if (!newDate || !newSectionId) {
      alert("Date and Section are required");
      return;
    }
    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    let fileUrl = null;

    // Handle file upload - using temp-uploads bucket with 3-day expiry
    if (newResourceType === "file" && selectedFile) {
      setUploadingFile(true);
      const result = await uploadFile(selectedFile, "daily-notes");
      setUploadingFile(false);

      if (!result.success || !result.publicUrl) {
        alert(result.error || "Failed to upload file. Please try again.");
        setIsSubmitting(false);
        return;
      }
      fileUrl = result.publicUrl;
    } else if (newResourceType === "link" && newResourceUrl) {
      fileUrl = newResourceUrl;
    }

    // Calculate expiry date (3 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    const payload: any = {
      date: newDate,
      topic: newTopic || null,
      notes: newNotes || null,
      section_id: parseInt(newSectionId),
      posted_by: userData.user.id,
      file_url: fileUrl,
      expires_at: expiresAt.toISOString(),
    };

    const { error } = await supabase.from("schedule_notes").insert(payload);

    if (error) {
      alert("Error creating note: " + error.message);
    } else {
      // Send Telegram notification to students in this section
      try {
        const sectionName =
          scopedSections.find((s) => s.id === parseInt(newSectionId))?.name ||
          "";
        const dateFormatted = new Date(newDate).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        let notifMessage = `📅 <b>New Class Note</b>\n\n`;
        notifMessage += `📆 <b>Date:</b> ${dateFormatted}\n`;
        if (newTopic) {
          notifMessage += `📌 <b>Topic:</b> ${newTopic}\n`;
        }
        if (newNotes) {
          notifMessage += `📝 <b>Notes:</b> ${newNotes}\n`;
        }
        if (fileUrl) {
          notifMessage += `\n📎 <a href="${fileUrl}">View Attachment</a>\n`;
        }
        notifMessage += `\nSection ${sectionName}`;

        // Create a broadcast record and invoke the edge function
        const { data: newBroadcast } = await supabase
          .from("broadcasts")
          .insert({
            message: notifMessage,
            target_level: "SECTION",
            section_id: parseInt(newSectionId),
            sent_by: userData.user.id,
            status: "Pending",
          })
          .select("id")
          .single();

        if (newBroadcast) {
          await supabase.functions.invoke("broadcast-message", {
            body: { broadcast_id: newBroadcast.id },
          });
        }
      } catch (notifErr) {
        // Notification failure should not block the note creation flow
        console.error("Failed to send schedule note notification:", notifErr);
      }

      fetchData();
      setShowAddModal(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setNewDate("");
    setNewTopic("");
    setNewNotes("");
    setNewCollegeId("");
    setNewYearId("");
    setNewSectionId("");
    setNewResourceType("none");
    setNewResourceUrl("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    const { error } = await supabase
      .from("schedule_notes")
      .delete()
      .eq("id", id);
    if (!error) fetchData();
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Daily Notes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Post daily class notes and materials by section • Files auto-expire
            in 3 days
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
        >
          + Add Entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Only show college filter if admin has access to multiple colleges */}
        {scopedColleges.length > 1 && (
          <div className="flex gap-2">
            {scopedColleges.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setFilterCollege(
                    filterCollege === c.id.toString() ? "" : c.id.toString(),
                  );
                  setFilterYear("");
                  setFilterSection("");
                }}
                className={`px-4 py-2 text-xs font-semibold border rounded-lg transition-all ${
                  filterCollege === c.id.toString()
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                }`}
              >
                {c.code}
              </button>
            ))}
          </div>
        )}

        {/* Show year filter if admin has access to multiple years */}
        {scopedYears.length > 1 && filterCollege && filterCollege !== "ALL" && (
          <Select
            value={filterYear}
            onValueChange={(v) => {
              setFilterYear(v);
              setFilterSection("ALL");
            }}
          >
            <SelectTrigger className="w-[140px] bg-white border-slate-200">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y.id} value={y.id.toString()}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Show section filter if admin has access to multiple sections */}
        {scopedSections.length > 1 && filterYear && filterYear !== "ALL" && (
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sections</SelectItem>
              {availableSections.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  Section {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(filterCollege || filterYear || filterSection) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCollege("");
              setFilterYear("");
              setFilterSection("");
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Notes Timeline */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : Object.keys(notesByDate).length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No class notes found. Add one!
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(notesByDate)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dateNotes]) => (
              <Card
                key={date}
                className="border-slate-200 shadow-sm rounded-3xl overflow-hidden"
              >
                <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {dateNotes.length} entries
                  </span>
                </div>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {dateNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 border text-[10px] font-bold">
                            {note.section?.semester?.year?.college?.code} - Sec{" "}
                            {note.section?.name}
                          </Badge>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {note.section?.semester?.year?.name}
                          </span>
                        </div>
                        {note.topic && (
                          <h4 className="font-semibold text-slate-900 mb-1">
                            {note.topic}
                          </h4>
                        )}
                        {note.notes && (
                          <p className="text-sm text-slate-500 line-clamp-3">
                            {note.notes}
                          </p>
                        )}
                        {note.admin?.name && (
                          <p className="text-xs text-slate-400 mt-2">
                            Posted by: {note.admin.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {note.file_url && (
                          <a
                            href={note.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              {note.file_url.includes(".pdf")
                                ? "📄 PDF"
                                : note.file_url.startsWith("http")
                                  ? "🔗 Link"
                                  : "📎 File"}
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(note.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Add Note Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Class Note</DialogTitle>
            <p className="text-sm text-slate-500">
              Post notes for a specific section
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
            </div>

            {/* College Selection - only show if admin has access to multiple colleges */}
            {scopedColleges.length > 1 ? (
              <div className="space-y-2">
                <Label>College *</Label>
                <div className="flex gap-2">
                  {scopedColleges.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setNewCollegeId(c.id.toString());
                        setNewYearId("");
                        setNewSectionId("");
                      }}
                      className={`flex-1 py-2.5 text-xs font-semibold border rounded-lg transition-all ${
                        newCollegeId === c.id.toString()
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            ) : scopedColleges.length === 1 ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500">College:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {scopedColleges[0]?.name}
                </span>
              </div>
            ) : null}

            {/* Year and Section */}
            {newCollegeId && (
              <div className="grid grid-cols-2 gap-4">
                {/* Year select - show if multiple years available */}
                {formYears.length > 1 ? (
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select
                      value={newYearId}
                      onValueChange={(v) => {
                        setNewYearId(v);
                        setNewSectionId("");
                      }}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {formYears.map((y) => (
                          <SelectItem key={y.id} value={y.id.toString()}>
                            {y.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : formYears.length === 1 ? (
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-900">
                        {formYears[0]?.name}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Section select - show if multiple sections available */}
                {formSections.length > 1 ? (
                  <div className="space-y-2">
                    <Label>Section *</Label>
                    <Select
                      value={newSectionId}
                      onValueChange={setNewSectionId}
                      disabled={!newYearId}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {formSections.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            Section {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : formSections.length === 1 ? (
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-900">
                        Section {formSections[0]?.name}
                      </span>
                    </div>
                  </div>
                ) : newYearId ? (
                  <div className="space-y-2">
                    <Label>Section *</Label>
                    <Select
                      value={newSectionId}
                      onValueChange={setNewSectionId}
                      disabled={!newYearId}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {formSections.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            Section {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            )}

            {/* Topic */}
            <div className="space-y-2">
              <Label>Topic / Title</Label>
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g., Contract Law - Offer and Acceptance"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes / Description</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Class notes, assignments, announcements..."
                className="bg-slate-50 border-slate-200 min-h-[100px]"
              />
            </div>

            {/* Attachment Type */}
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
                    <div>
                      <span className="text-3xl mb-2 block">📄</span>
                      <span className="text-sm font-medium text-slate-700">
                        {selectedFile.name}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl mb-2 block">📄</span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                        Click to Upload PDF or Image
                      </span>
                      <p className="text-xs text-slate-400 mt-1">Max 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Link Input */}
            {newResourceType === "link" && (
              <div className="space-y-2">
                <Input
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            )}

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
                  isSubmitting || uploadingFile || !newDate || !newSectionId
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {uploadingFile
                  ? "Uploading..."
                  : isSubmitting
                    ? "Adding..."
                    : "Post Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
