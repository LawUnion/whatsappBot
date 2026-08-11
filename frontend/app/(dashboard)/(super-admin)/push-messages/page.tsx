"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAdminScope } from "@/hooks/useAdminScope";

// Extended target levels including SEMESTER
const TARGET_LEVELS = [
  "FACULTY",
  "COLLEGE",
  "YEAR",
  "SEMESTER",
  "SECTION",
] as const;
type ExtendedTargetLevel = (typeof TARGET_LEVELS)[number];


export default function PushMessagesPage() {
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

  const [message, setMessage] = useState("");
  const [targetLevel, setTargetLevel] =
    useState<ExtendedTargetLevel>("FACULTY");
  const [colleges, setColleges] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [sendTime, setSendTime] = useState<"NOW" | "LATER">("NOW");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [hasMoreBroadcasts, setHasMoreBroadcasts] = useState(false);
  const [broadcastPage, setBroadcastPage] = useState(0);
  const BROADCASTS_PER_PAGE = 10;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  // Attachment state
  const [attachmentType, setAttachmentType] = useState<
    "none" | "file" | "link"
  >("none");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Set initial values based on admin scope
  useEffect(() => {
    if (!adminLoading && admin) {
      // Set default target level and selections based on admin scope
      if (adminSectionId) {
        setTargetLevel("SECTION");
        setSelectedSectionId(adminSectionId.toString());
      } else if (adminYearId) {
        setTargetLevel("YEAR");
        setSelectedYearId(adminYearId.toString());
      } else if (adminCollegeId) {
        setTargetLevel("COLLEGE");
        setSelectedCollegeId(adminCollegeId.toString());
      }
    }
  }, [adminLoading, admin, adminCollegeId, adminYearId, adminSectionId]);

  useEffect(() => {
    if (!adminLoading) {
      fetchInitialData();
    }
  }, [adminLoading]);

  const fetchBroadcasts = async (page: number, append = false) => {
    setBroadcastsLoading(true);
    const from = page * BROADCASTS_PER_PAGE;
    const to = from + BROADCASTS_PER_PAGE; // fetch one extra to check if more exist

    const { data, error } = await supabase
      .from("broadcasts")
      .select("*, college:colleges(code)")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      const hasMore = data.length > BROADCASTS_PER_PAGE;
      const items = hasMore ? data.slice(0, BROADCASTS_PER_PAGE) : data;
      setHasMoreBroadcasts(hasMore);
      setBroadcasts((prev) => (append ? [...prev, ...items] : items));
      setBroadcastPage(page);
    }
    setBroadcastsLoading(false);
  };

  const loadMoreBroadcasts = () => {
    fetchBroadcasts(broadcastPage + 1, true);
  };

  const fetchInitialData = async () => {
    const [collegesRes, yearsRes, semestersRes, sectionsRes] =
      await Promise.all([
        supabase.from("colleges").select("*"),
        supabase.from("years").select("*"),
        supabase.from("semesters").select("*, year:years(college_id)"),
        supabase
          .from("sections")
          .select("*, semester:semesters(year_id, year:years(college_id))"),
      ]);

    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (semestersRes.data) setSemesters(semestersRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);

    // Fetch broadcasts separately (resets to page 0)
    fetchBroadcasts(0);
  };

  // Filter colleges based on admin scope
  const scopedColleges = useMemo(() => {
    if (isSuperAdmin || !adminCollegeId) return colleges;
    return colleges.filter((c) => c.id === adminCollegeId);
  }, [colleges, isSuperAdmin, adminCollegeId]);

  // Filter years based on admin scope
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

  // Filter semesters based on admin scope
  const scopedSemesters = useMemo(() => {
    let filtered = semesters;
    if (adminCollegeId) {
      filtered = filtered.filter(
        (s: any) => s.year?.college_id === adminCollegeId,
      );
    }
    if (adminYearId) {
      filtered = filtered.filter((s) => s.year_id === adminYearId);
    }
    return filtered;
  }, [semesters, adminCollegeId, adminYearId]);

  // Filter sections based on admin scope
  const scopedSections = useMemo(() => {
    let filtered = sections;
    if (adminCollegeId) {
      filtered = filtered.filter(
        (s: any) => s.semester?.year?.college_id === adminCollegeId,
      );
    }
    if (adminYearId) {
      filtered = filtered.filter(
        (s: any) => s.semester?.year_id === adminYearId,
      );
    }
    if (adminSectionId) {
      filtered = filtered.filter((s) => s.id === adminSectionId);
    }
    return filtered;
  }, [sections, adminCollegeId, adminYearId, adminSectionId]);

  // Get available target levels based on admin scope
  const availableTargetLevels = useMemo(() => {
    if (isSuperAdmin) return TARGET_LEVELS;
    if (adminSectionId) return ["SECTION"] as const;
    if (adminYearId) return ["YEAR", "SEMESTER", "SECTION"] as const;
    if (adminCollegeId)
      return ["COLLEGE", "YEAR", "SEMESTER", "SECTION"] as const;
    return TARGET_LEVELS;
  }, [isSuperAdmin, adminCollegeId, adminYearId, adminSectionId]);

  // Filter years by selected college (using scoped years)
  const availableYears = useMemo(
    () =>
      selectedCollegeId
        ? scopedYears.filter(
            (y) => y.college_id === parseInt(selectedCollegeId),
          )
        : scopedYears,
    [scopedYears, selectedCollegeId],
  );

  // Filter semesters by selected year (using scoped semesters)
  const availableSemesters = useMemo(
    () =>
      selectedYearId
        ? scopedSemesters.filter((s) => s.year_id === parseInt(selectedYearId))
        : scopedSemesters,
    [scopedSemesters, selectedYearId],
  );

  // Filter sections by selected semester or year (deduplicate by name, using scoped sections)
  const availableSections = useMemo(() => {
    let filteredSections = scopedSections;

    if (selectedSemesterId) {
      filteredSections = filteredSections.filter(
        (s) => s.semester_id === parseInt(selectedSemesterId),
      );
    } else if (selectedYearId) {
      filteredSections = filteredSections.filter(
        (s) => s.semester?.year_id === parseInt(selectedYearId),
      );
    }

    // Deduplicate by name
    const seen = new Set<string>();
    return filteredSections.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [scopedSections, selectedSemesterId, selectedYearId]);

  // Fetch actual recipient count from DB
  useEffect(() => {
    const fetchRecipientCount = async () => {
      let query = supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "Active");

      if (targetLevel === "COLLEGE" && selectedCollegeId) {
        query = query.eq("college_id", parseInt(selectedCollegeId));
      } else if (targetLevel === "YEAR" && selectedYearId) {
        query = query.eq("year_id", parseInt(selectedYearId));
      } else if (targetLevel === "SECTION" && selectedSectionId) {
        query = query.eq("section_id", parseInt(selectedSectionId));
      } else if (targetLevel === "SEMESTER" && selectedSemesterId) {
        // Semester maps to a year — get sections in that semester
        const { data: semSections } = await supabase
          .from("sections")
          .select("id")
          .eq("semester_id", parseInt(selectedSemesterId));
        if (semSections && semSections.length > 0) {
          query = query.in("section_id", semSections.map((s: any) => s.id));
        }
      }

      const { count } = await query;
      setRecipientCount(count ?? 0);
    };

    fetchRecipientCount();
  }, [targetLevel, selectedCollegeId, selectedYearId, selectedSemesterId, selectedSectionId]);

  const recipientEstimate = recipientCount ?? 0;

  // Get target display name
  const getTargetName = () => {
    if (targetLevel === "FACULTY") return "Entire Faculty";
    if (targetLevel === "COLLEGE" && selectedCollegeId) {
      return (
        colleges.find((c) => c.id === parseInt(selectedCollegeId))?.name ||
        "College"
      );
    }
    if (targetLevel === "YEAR" && selectedYearId) {
      const year = years.find((y) => y.id === parseInt(selectedYearId));
      const college = colleges.find(
        (c) => c.id === parseInt(selectedCollegeId),
      );
      return `${college?.code} - ${year?.name}`;
    }
    if (targetLevel === "SEMESTER" && selectedSemesterId) {
      const semester = semesters.find(
        (s) => s.id === parseInt(selectedSemesterId),
      );
      const year = years.find((y) => y.id === parseInt(selectedYearId));
      const college = colleges.find(
        (c) => c.id === parseInt(selectedCollegeId),
      );
      return `${college?.code} - ${year?.name} - ${semester?.name}`;
    }
    if (targetLevel === "SECTION" && selectedSectionId) {
      const section = sections.find(
        (s) => s.id === parseInt(selectedSectionId),
      );
      return `Section ${section?.name}`;
    }
    return "Select target";
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
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setAttachmentUrl("");
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `broadcasts/${fileName}`;

    const { error } = await supabase.storage
      .from("uploads")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("uploads").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setIsSending(false);
      return;
    }

    let fileUrl = null;

    // Handle file upload
    if (attachmentType === "file" && selectedFile) {
      setUploadingFile(true);
      fileUrl = await uploadFile(selectedFile);
      setUploadingFile(false);

      if (!fileUrl) {
        toast.error("Failed to upload file. Please try again.");
        setIsSending(false);
        return;
      }
    } else if (attachmentType === "link" && attachmentUrl) {
      fileUrl = attachmentUrl;
    }

    // Build message with attachment if present
    let finalMessage = message;
    if (fileUrl) {
      finalMessage += `\n\n📎 Attachment: ${fileUrl}`;
    }

    const payload: any = {
      message: finalMessage,
      target_level: targetLevel === "SEMESTER" ? "YEAR" : targetLevel, // Map SEMESTER to YEAR for DB
      sent_by: userData.user.id,
      status: "Pending",
    };

    if (selectedCollegeId) payload.college_id = parseInt(selectedCollegeId);
    if (selectedYearId) payload.year_id = parseInt(selectedYearId);
    if (selectedSectionId) payload.section_id = parseInt(selectedSectionId);

    if (sendTime === "LATER" && scheduledDate && scheduledTime) {
      payload.scheduled_at = `${scheduledDate}T${scheduledTime}:00`;
    }

    const { data: newBroadcast, error } = await supabase
      .from("broadcasts")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      toast.error("Error creating broadcast: " + error.message);
      setIsSending(false);
      return;
    }

    // For immediate sends, invoke the broadcast edge function to actually send
    if (sendTime === "NOW" && newBroadcast) {
      const { error: invokeError } = await supabase.functions.invoke(
        "broadcast-message",
        { body: { broadcast_id: newBroadcast.id } },
      );

      if (invokeError) {
        toast.error(
          "Broadcast created but failed to send: " +
            invokeError.message +
            "\nIt will remain in Pending status.",
        );
      } else {
        toast.success("Broadcast sent successfully!");
      }
    } else {
      toast.success("Broadcast scheduled successfully!");
    }

    resetForm();
    // Refresh broadcasts list from page 0 after sending
    fetchBroadcasts(0);
    setIsSending(false);
  };

  const resetForm = () => {
    setMessage("");
    setTargetLevel("FACULTY");
    setSelectedCollegeId("");
    setSelectedYearId("");
    setSelectedSemesterId("");
    setSelectedSectionId("");
    setSendTime("NOW");
    setScheduledDate("");
    setScheduledTime("");
    setAttachmentType("none");
    setAttachmentUrl("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canSend =
    message.trim() &&
    (targetLevel === "FACULTY" ||
      (targetLevel === "COLLEGE" && selectedCollegeId) ||
      (targetLevel === "YEAR" && selectedYearId) ||
      (targetLevel === "SEMESTER" && selectedSemesterId) ||
      (targetLevel === "SECTION" && selectedSectionId));

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Push Messages
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Broadcast messages to students via Telegram
          </p>
        </div>
        <Badge
          variant="outline"
          className="px-3 py-1.5 text-slate-600 border-slate-200"
        >
          Telegram
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base">Compose Message</CardTitle>
              <CardDescription className="text-xs">
                Write your broadcast message
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[180px] resize-none bg-slate-50 border-slate-200"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{message.length} characters</span>
                <span>Supports Telegram markdown (*bold*, _italic_)</span>
              </div>

              {/* Attachment Section */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Attachment (Optional)
                </Label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType("none");
                      setSelectedFile(null);
                      setAttachmentUrl("");
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                      attachmentType === "none"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType("file");
                      setAttachmentUrl("");
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                      attachmentType === "file"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    Image / PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType("link");
                      setSelectedFile(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                      attachmentType === "link"
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    Link
                  </button>
                </div>

                {/* File Upload */}
                {attachmentType === "file" && (
                  <div>
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
                          <span className="text-xl">📄</span>
                          <span className="text-sm font-medium text-slate-700">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-2xl block mb-1">📤</span>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Click to Upload (Max 10MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Input */}
                {attachmentType === "link" && (
                  <Input
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="bg-slate-50 border-slate-200"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Target Selector */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base">Target Audience</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Target Level - only show available levels based on admin scope */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Scope
                </label>
                {availableTargetLevels.length > 1 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTargetLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          setTargetLevel(level);
                          if (level === "FACULTY") {
                            setSelectedCollegeId("");
                            setSelectedYearId("");
                            setSelectedSemesterId("");
                            setSelectedSectionId("");
                          }
                        }}
                        className={`py-2 text-[10px] font-semibold rounded-lg border transition-all ${
                          targetLevel === level
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-900">
                      {availableTargetLevels[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* College Selection - only show if admin has access to multiple colleges */}
              {targetLevel !== "FACULTY" && scopedColleges.length > 1 ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    College
                  </label>
                  <div className="flex gap-2">
                    {scopedColleges.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCollegeId(c.id.toString());
                          setSelectedYearId("");
                          setSelectedSemesterId("");
                          setSelectedSectionId("");
                        }}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                          selectedCollegeId === c.id.toString()
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>
              ) : targetLevel !== "FACULTY" && scopedColleges.length === 1 ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">College:</span>
                  <span className="ml-2 font-medium text-slate-900">
                    {scopedColleges[0]?.name}
                  </span>
                </div>
              ) : null}

              {/* Year Selection */}
              {["YEAR", "SEMESTER", "SECTION"].includes(targetLevel) &&
                selectedCollegeId && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Year
                    </label>
                    <Select
                      value={selectedYearId}
                      onValueChange={(v) => {
                        setSelectedYearId(v);
                        setSelectedSemesterId("");
                        setSelectedSectionId("");
                      }}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((y) => (
                          <SelectItem key={y.id} value={y.id.toString()}>
                            {y.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Semester Selection */}
              {["SEMESTER", "SECTION"].includes(targetLevel) &&
                selectedYearId && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Semester
                    </label>
                    <Select
                      value={selectedSemesterId}
                      onValueChange={(v) => {
                        setSelectedSemesterId(v);
                        setSelectedSectionId("");
                      }}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSemesters.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Section Selection */}
              {targetLevel === "SECTION" &&
                (selectedSemesterId || selectedYearId) && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Section
                    </label>
                    <Select
                      value={selectedSectionId}
                      onValueChange={setSelectedSectionId}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSections.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            Section {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Estimated Recipients */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Est. Recipients
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {recipientCount === null ? "..." : recipientEstimate.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  When to Send
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSendTime("NOW")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      sendTime === "NOW"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Now
                  </button>
                  <button
                    onClick={() => setSendTime("LATER")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      sendTime === "LATER"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Schedule
                  </button>
                </div>
              </div>

              {sendTime === "LATER" && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
              )}

              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={isSending || uploadingFile || !canSend}
                className="w-full bg-slate-900 hover:bg-slate-800"
              >
                {uploadingFile
                  ? "Uploading..."
                  : isSending
                    ? "Sending..."
                    : "Send Broadcast"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Broadcast History */}
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Broadcasts</CardTitle>
            {broadcasts.length > 0 && (
              <span className="text-xs text-slate-400">
                Showing {broadcasts.length} broadcast{broadcasts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.length === 0 && !broadcastsLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-slate-500"
                  >
                    No broadcasts yet
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/50">
                    <TableCell className="max-w-[250px] text-slate-700">
                      <span className="block truncate" title={b.message}>
                        {b.message.length > 100
                          ? b.message.slice(0, 100) + "..."
                          : b.message}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-normal text-slate-600 bg-white border-slate-200"
                      >
                        {b.college?.code || b.target_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {b.recipient_count || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`font-normal ${
                          b.status === "Success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : b.status === "Failed"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : b.status === "Partial"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-slate-100 text-slate-600"
                        } border`}
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                      {new Date(b.sent_at || b.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                      <span className="block text-xs text-slate-400">
                        {new Date(b.sent_at || b.created_at).toLocaleTimeString(
                          undefined,
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Load More */}
          {(hasMoreBroadcasts || broadcastsLoading) && (
            <div className="flex justify-center py-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMoreBroadcasts}
                disabled={broadcastsLoading}
                className="text-slate-600 border-slate-200"
              >
                {broadcastsLoading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader>
            <DialogTitle>Confirm Broadcast</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-3xl border border-amber-100">
              📢
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                You are about to send a message to:
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {getTargetName()}
              </p>
              <p className="text-sm text-slate-500">
                {recipientCount === null ? "..." : recipientEstimate.toLocaleString()} recipients
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg text-left">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Message Preview
              </p>
              <p className="text-sm text-slate-700 line-clamp-3">{message}</p>
              {attachmentType !== "none" && (selectedFile || attachmentUrl) && (
                <p className="text-xs text-blue-600 mt-2">
                  📎 {selectedFile ? selectedFile.name : "Link attached"}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                Confirm & Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
