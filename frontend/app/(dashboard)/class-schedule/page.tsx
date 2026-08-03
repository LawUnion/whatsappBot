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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { useAdminScope } from "@/hooks/useAdminScope";

interface Timetable {
  id: string;
  section_id: number;
  semester_id: number;
  title: string;
  file_url: string;
  academic_year: string;
  effective_from: string;
  notes: string;
  active: boolean;
  created_at: string;
  section?: {
    name: string;
    semester?: {
      name: string;
      year?: {
        name: string;
        college?: { code: string; name: string };
      };
    };
  };
  admin?: { name: string };
}

interface College {
  id: number;
  code: string;
  name: string;
}

interface Year {
  id: number;
  name: string;
  college_id: number;
}

interface Semester {
  id: number;
  name: string;
  year_id: number;
}

interface Section {
  id: number;
  name: string;
  semester_id: number;
  semester?: { year_id: number };
}

export default function ClassSchedulePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    admin,
    loading: adminLoading,
    isSuperAdmin,
    collegeId: adminCollegeId,
    yearId: adminYearId,
    sectionId: adminSectionId,
  } = useAdminScope();

  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCollege, setFilterCollege] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [title, setTitle] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Set initial values based on admin scope
  useEffect(() => {
    if (!adminLoading && admin) {
      if (adminCollegeId) {
        setFilterCollege(
          colleges.find((c) => c.id === adminCollegeId)?.code || "",
        );
        setSelectedCollegeId(adminCollegeId.toString());
      }
    }
  }, [adminLoading, admin, adminCollegeId, colleges]);

  useEffect(() => {
    if (!adminLoading) {
      fetchData();
    }
  }, [adminLoading]);

  const fetchData = async () => {
    setLoading(true);

    const [timetablesRes, collegesRes, yearsRes, semestersRes, sectionsRes] =
      await Promise.all([
        supabase
          .from("class_timetables")
          .select(
            `
          *,
          section:sections(
            name,
            semester:semesters(
              name,
              year:years(
                name,
                college:colleges(code, name)
              )
            )
          ),
          admin:admins(name)
        `,
          )
          .eq("active", true)
          .order("created_at", { ascending: false }),
        supabase.from("colleges").select("*").order("id"),
        supabase
          .from("years")
          .select("*")
          .order("college_id")
          .order("year_number"),
        supabase
          .from("semesters")
          .select("*")
          .order("year_id")
          .order("semester_number"),
        supabase
          .from("sections")
          .select("*, semester:semesters(year_id, year:years(college_id))")
          .order("name"),
      ]);

    let filteredTimetables = timetablesRes.data || [];

    // Filter timetables by admin scope
    if (adminSectionId) {
      filteredTimetables = filteredTimetables.filter(
        (t: Timetable) => t.section_id === adminSectionId,
      );
    } else if (adminCollegeId) {
      const collegeCode = collegesRes.data?.find(
        (c: College) => c.id === adminCollegeId,
      )?.code;
      filteredTimetables = filteredTimetables.filter(
        (t: Timetable) =>
          t.section?.semester?.year?.college?.code === collegeCode,
      );
    }

    setTimetables(filteredTimetables);
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

  // Filtered data for form dropdowns - use scoped data
  const filteredYears = useMemo(
    () =>
      selectedCollegeId
        ? scopedYears.filter(
            (y) => y.college_id === parseInt(selectedCollegeId),
          )
        : scopedYears,
    [scopedYears, selectedCollegeId],
  );

  const filteredSemesters = useMemo(
    () =>
      selectedYearId
        ? semesters.filter((s) => s.year_id === parseInt(selectedYearId))
        : [],
    [semesters, selectedYearId],
  );

  const filteredSections = useMemo(() => {
    if (!selectedSemesterId) return [];

    // If admin is restricted to a section, only show that section
    if (adminSectionId) {
      return scopedSections.filter((s) => s.id === adminSectionId);
    }

    return scopedSections.filter(
      (s) => s.semester_id === parseInt(selectedSemesterId),
    );
  }, [scopedSections, selectedSemesterId, adminSectionId]);

  // Group timetables by college for display
  const timetablesByCollege = useMemo(() => {
    let filtered = timetables;

    if (filterCollege) {
      filtered = filtered.filter(
        (t) => t.section?.semester?.year?.college?.code === filterCollege,
      );
    }

    if (filterYear) {
      filtered = filtered.filter(
        (t) => t.section?.semester?.year?.name === filterYear,
      );
    }

    const grouped: Record<string, Timetable[]> = {};

    filtered.forEach((t) => {
      const collegeCode = t.section?.semester?.year?.college?.code || "Unknown";
      if (!grouped[collegeCode]) grouped[collegeCode] = [];
      grouped[collegeCode].push(t);
    });

    return grouped;
  }, [timetables, filterCollege, filterYear]);

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
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSectionId || !selectedSemesterId || !selectedFile) {
      toast.error("Please select section and upload a timetable file");
      return;
    }

    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setIsSubmitting(false);
      return;
    }

    // Upload file
    setUploadingFile(true);
    const result = await uploadFile(selectedFile, "schedules");
    setUploadingFile(false);

    if (!result.success) {
      toast.error(result.error || "Failed to upload file");
      setIsSubmitting(false);
      return;
    }

    // Deactivate any existing timetable for this section/semester
    await supabase
      .from("class_timetables")
      .update({ active: false })
      .eq("section_id", parseInt(selectedSectionId))
      .eq("semester_id", parseInt(selectedSemesterId));

    // Insert new timetable
    const section = sections.find((s) => s.id === parseInt(selectedSectionId));
    const semester = semesters.find(
      (s) => s.id === parseInt(selectedSemesterId),
    );
    const year = years.find((y) => y.id === parseInt(selectedYearId));
    const college = colleges.find((c) => c.id === parseInt(selectedCollegeId));

    const autoTitle =
      title ||
      `${college?.code} - ${year?.name} - ${semester?.name} - Section ${section?.name}`;

    const payload = {
      section_id: parseInt(selectedSectionId),
      semester_id: parseInt(selectedSemesterId),
      title: autoTitle,
      file_url: result.publicUrl,
      academic_year: academicYear || null,
      effective_from: effectiveFrom || null,
      notes: notes || null,
      uploaded_by: userData.user.id,
      active: true,
    };

    const { error } = await supabase.from("class_timetables").insert(payload);

    if (error) {
      toast.error("Error saving timetable: " + error.message);
    } else {
      toast.success("Timetable uploaded successfully!");
      fetchData();
      setShowAddModal(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setSelectedCollegeId("");
    setSelectedYearId("");
    setSelectedSemesterId("");
    setSelectedSectionId("");
    setTitle("");
    setAcademicYear("");
    setEffectiveFrom("");
    setNotes("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this timetable?")) return;

    const { error } = await supabase
      .from("class_timetables")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      toast.error("Error deleting timetable");
    } else {
      toast.success("Timetable removed");
      fetchData();
    }
  };

  // Get current academic year suggestion
  const currentAcademicYear = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // Academic year typically starts in July/August
    if (month >= 6) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    }
    return `${year - 1}-${year.toString().slice(-2)}`;
  }, []);

  // Stats
  const totalTimetables = timetables.length;
  const collegesWithTimetables = new Set(
    timetables.map((t) => t.section?.semester?.year?.college?.code),
  ).size;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Class Timetables
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Section-wise semester timetables (updated every 6 months)
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          + Upload Timetable
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
              TT
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {totalTimetables}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Total Timetables
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              C
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {collegesWithTimetables}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Colleges Covered
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              AY
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {currentAcademicYear}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Current Session
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - only show if admin has access to multiple colleges */}
      {scopedColleges.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-500">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilterCollege("");
                setFilterYear("");
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                !filterCollege
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              All
            </button>
            {scopedColleges.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setFilterCollege(c.code);
                  setFilterYear("");
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  filterCollege === c.code
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {c.code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timetables Display */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading timetables...
        </div>
      ) : Object.keys(timetablesByCollege).length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4 opacity-30">No timetables</div>
            <p className="text-slate-500 mb-4">No timetables uploaded yet</p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-slate-900 hover:bg-slate-800"
            >
              Upload First Timetable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(timetablesByCollege).map(
            ([collegeCode, collegeTimetables]) => (
              <Card
                key={collegeCode}
                className="border-slate-200 shadow-sm rounded-3xl overflow-hidden"
              >
                <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-slate-700 border">
                      {collegeCode}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {colleges.find((c) => c.code === collegeCode)?.name ||
                          collegeCode}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {collegeTimetables.length} timetable(s)
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collegeTimetables.map((tt) => (
                      <div
                        key={tt.id}
                        className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                            {tt.section?.semester?.year?.name} - Sec{" "}
                            {tt.section?.name}
                          </Badge>
                          <span className="text-[10px] text-slate-400">
                            {tt.academic_year || ""}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-1">
                          {tt.section?.semester?.name}
                        </p>
                        {tt.effective_from && (
                          <p className="text-xs text-slate-500 mb-2">
                            Effective:{" "}
                            {new Date(tt.effective_from).toLocaleDateString()}
                          </p>
                        )}
                        {tt.notes && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                            {tt.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <a
                            href={tt.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                              View PDF
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tt.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            Del
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Class Timetable</DialogTitle>
            <p className="text-sm text-slate-500">
              Upload semester timetable for a specific section
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
                        setSelectedCollegeId(c.id.toString());
                        setSelectedYearId("");
                        setSelectedSemesterId("");
                        setSelectedSectionId("");
                      }}
                      className={`flex-1 py-2.5 text-xs font-semibold border rounded-lg transition-all ${
                        selectedCollegeId === c.id.toString()
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
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

            {/* Year, Semester, Section */}
            {selectedCollegeId && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Select
                    value={selectedYearId}
                    onValueChange={(v) => {
                      setSelectedYearId(v);
                      setSelectedSemesterId("");
                      setSelectedSectionId("");
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredYears.map((y) => (
                        <SelectItem key={y.id} value={y.id.toString()}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Semester *</Label>
                  <Select
                    value={selectedSemesterId}
                    onValueChange={(v) => {
                      setSelectedSemesterId(v);
                      setSelectedSectionId("");
                    }}
                    disabled={!selectedYearId}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSemesters.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Select
                    value={selectedSectionId}
                    onValueChange={setSelectedSectionId}
                    disabled={!selectedSemesterId}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSections.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          Section {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Academic Year & Effective Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder={currentAcademicYear}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Timetable File (PDF/Image) *</Label>
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
                      {selectedFile.type === "application/pdf" ? "PDF" : "IMG"}
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
                      Click to upload PDF or Image
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this timetable..."
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
                  isSubmitting ||
                  uploadingFile ||
                  !selectedSectionId ||
                  !selectedFile
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {uploadingFile
                  ? "Uploading..."
                  : isSubmitting
                    ? "Saving..."
                    : "Upload Timetable"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
