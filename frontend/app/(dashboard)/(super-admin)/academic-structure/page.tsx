"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface College {
  id: number;
  code: string;
  name: string;
}

interface Year {
  id: number;
  name: string;
  year_number: number;
  college_id: number;
}

interface Semester {
  id: number;
  year_id: number;
  semester_number: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
  semester_id: number;
  semester?: {
    id: number;
    year_id: number;
    semester_number: number;
  };
}

export default function AcademicStructurePage() {
  const supabase = createClient();
  const [colleges, setColleges] = useState<College[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [showAddCollege, setShowAddCollege] = useState(false);

  // Form states
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionSemesterId, setNewSectionSemesterId] = useState("");
  const [newSemesterYearId, setNewSemesterYearId] = useState("");
  const [newSemesterNumber, setNewSemesterNumber] = useState("");
  const [newYearName, setNewYearName] = useState("");
  const [newYearNumber, setNewYearNumber] = useState("");
  const [newYearCollegeId, setNewYearCollegeId] = useState("");
  const [newCollegeCode, setNewCollegeCode] = useState("");
  const [newCollegeName, setNewCollegeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [collegesRes, yearsRes, semestersRes, sectionsRes] =
      await Promise.all([
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
          .select("*, semester:semesters(id, year_id, semester_number)")
          .order("name"),
      ]);

    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (semestersRes.data) setSemesters(semestersRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCollegeEmoji = (code: string) => {
    if (code === "LC1" || code === "LC-1") return "📗";
    if (code === "LC2" || code === "LC-2") return "📘";
    return "📙";
  };

  const getYearsForCollege = (collegeId: number) => {
    return years.filter((y) => y.college_id === collegeId);
  };

  const getSemestersForYear = (yearId: number) => {
    return semesters.filter((s) => s.year_id === yearId);
  };

  const getSectionsForSemester = (semesterId: number) => {
    return sections.filter((s) => s.semester_id === semesterId);
  };

  const getSectionsForYear = (yearId: number) => {
    return sections.filter((s) => s.semester?.year_id === yearId);
  };

  const handleAddSection = async () => {
    if (!newSectionName || !newSectionSemesterId) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("sections").insert({
      name: newSectionName.toUpperCase(),
      semester_id: parseInt(newSectionSemesterId),
    });

    if (!error) {
      fetchData();
      setShowAddSection(false);
      setNewSectionName("");
      setNewSectionSemesterId("");
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const handleAddSemester = async () => {
    if (!newSemesterYearId || !newSemesterNumber) return;
    setIsSubmitting(true);

    const yearNum =
      years.find((y) => y.id === parseInt(newSemesterYearId))?.year_number || 1;
    const semNum = parseInt(newSemesterNumber);
    const semesterName = `Semester ${(yearNum - 1) * 2 + semNum}`;

    const { error } = await supabase.from("semesters").insert({
      year_id: parseInt(newSemesterYearId),
      semester_number: semNum,
      name: semesterName,
    });

    if (!error) {
      fetchData();
      setShowAddSemester(false);
      setNewSemesterYearId("");
      setNewSemesterNumber("");
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const handleAddYear = async () => {
    if (!newYearName || !newYearCollegeId || !newYearNumber) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("years").insert({
      name: newYearName,
      year_number: parseInt(newYearNumber),
      college_id: parseInt(newYearCollegeId),
    });

    if (!error) {
      fetchData();
      setShowAddYear(false);
      setNewYearName("");
      setNewYearNumber("");
      setNewYearCollegeId("");
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const handleAddCollege = async () => {
    if (!newCollegeCode || !newCollegeName) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("colleges").insert({
      code: newCollegeCode.toUpperCase(),
      name: newCollegeName,
    });

    if (!error) {
      fetchData();
      setShowAddCollege(false);
      setNewCollegeCode("");
      setNewCollegeName("");
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("sections").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteSemester = async (id: number) => {
    const semSections = getSectionsForSemester(id);
    if (semSections.length > 0) {
      alert("Cannot delete semester with sections. Delete sections first.");
      return;
    }
    if (!confirm("Delete this semester?")) return;
    await supabase.from("semesters").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteYear = async (id: number) => {
    const yearSems = getSemestersForYear(id);
    if (yearSems.length > 0) {
      alert("Cannot delete year with semesters. Delete semesters first.");
      return;
    }
    if (!confirm("Delete this year?")) return;
    await supabase.from("years").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteCollege = async (id: number) => {
    const collegeYears = getYearsForCollege(id);
    if (collegeYears.length > 0) {
      alert("Cannot delete college with years. Delete years first.");
      return;
    }
    if (!confirm("Delete this college?")) return;
    await supabase.from("colleges").delete().eq("id", id);
    fetchData();
  };

  const totalSections = sections.length;
  const totalSemesters = semesters.length;
  const totalYears = years.length;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Academic Structure
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage colleges, years, semesters, and sections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-6">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Sections
              </p>
              <p className="text-xl font-bold text-indigo-600">
                {totalSections}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Semesters
              </p>
              <p className="text-xl font-bold text-emerald-600">
                {totalSemesters}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Years
              </p>
              <p className="text-xl font-bold text-slate-800">{totalYears}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setShowAddCollege(true)}
          className="border-slate-200"
        >
          + College
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAddYear(true)}
          className="border-slate-200"
        >
          + Year
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAddSemester(true)}
          className="border-slate-200"
        >
          + Semester
        </Button>
        <Button
          onClick={() => setShowAddSection(true)}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          + Section
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading academic structure...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {colleges.map((college) => {
            const emoji = getCollegeEmoji(college.code);
            const collegeYears = getYearsForCollege(college.id);
            const totalCollegeSections = collegeYears.reduce(
              (acc, y) => acc + getSectionsForYear(y.id).length,
              0,
            );

            return (
              <Card
                key={college.id}
                className="border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-lg transition-all"
              >
                {/* College Header */}
                <div
                  className={`p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100`}
                    >
                      {emoji}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                        {college.name}
                      </h2>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Code: {college.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-2">
                        Total Sections:
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {totalCollegeSections}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCollege(college.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                {/* Years and Semesters */}
                <CardContent className="p-6">
                  {collegeYears.length > 0 ? (
                    <div className="space-y-6">
                      {collegeYears.map((year) => {
                        const yearSemesters = getSemestersForYear(year.id);

                        return (
                          <div
                            key={year.id}
                            className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100"
                          >
                            {/* Year Header */}
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                {year.name}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-md border">
                                  {yearSemesters.length} Semesters
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteYear(year.id)}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>

                            {/* Semesters Grid */}
                            {yearSemesters.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {yearSemesters.map((semester) => {
                                  const semesterSections =
                                    getSectionsForSemester(semester.id);

                                  return (
                                    <div
                                      key={semester.id}
                                      className="bg-white rounded-xl p-4 border border-slate-200"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-slate-700">
                                          {semester.name}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant="outline"
                                            className="text-[10px]"
                                          >
                                            {semesterSections.length} Sections
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleDeleteSemester(semester.id)
                                            }
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-5 w-5 p-0 text-xs"
                                          >
                                            ×
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {semesterSections.map((section) => (
                                          <div
                                            key={section.id}
                                            className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md transition-all cursor-pointer group relative"
                                            title={`Section ${section.name}`}
                                          >
                                            {section.name}
                                            <button
                                              onClick={() =>
                                                handleDeleteSection(section.id)
                                              }
                                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        {semesterSections.length === 0 && (
                                          <p className="text-xs text-slate-400 italic">
                                            No sections
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No semesters configured. Add semesters to this
                                year.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 italic">
                      No years configured for this college
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {colleges.length === 0 && (
            <Card className="border-slate-200 shadow-sm rounded-3xl">
              <CardContent className="py-16 text-center">
                <p className="text-slate-500">
                  No colleges configured. Add one to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Technical Note */}
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-5 shadow-xl">
        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-2xl">
          💡
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-tight">
            Structure Hierarchy
          </h4>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight leading-relaxed">
            College → Year → Semester → Section. Changes affect broadcast
            targeting immediately.
          </p>
        </div>
      </div>

      {/* Add Section Modal */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Semester
              </label>
              <Select
                value={newSectionSemesterId}
                onValueChange={setNewSectionSemesterId}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((sem) => {
                    const year = years.find((y) => y.id === sem.year_id);
                    const college = colleges.find(
                      (c) => c.id === year?.college_id,
                    );
                    return (
                      <SelectItem key={sem.id} value={sem.id.toString()}>
                        {college?.code} - {year?.name} - {sem.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Section Name
              </label>
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g., A, B, C"
                maxLength={2}
                className="bg-slate-50 border-slate-200 uppercase"
              />
              <p className="text-xs text-slate-400">Single letter (A-Z)</p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddSection(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSection}
                disabled={
                  isSubmitting || !newSectionName || !newSectionSemesterId
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? "Adding..." : "Add Section"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Semester Modal */}
      <Dialog open={showAddSemester} onOpenChange={setShowAddSemester}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Semester</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Year
              </label>
              <Select
                value={newSemesterYearId}
                onValueChange={setNewSemesterYearId}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => {
                    const college = colleges.find((c) => c.id === y.college_id);
                    return (
                      <SelectItem key={y.id} value={y.id.toString()}>
                        {college?.code} - {y.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Semester Number (within year)
              </label>
              <Select
                value={newSemesterNumber}
                onValueChange={setNewSemesterNumber}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Semester</SelectItem>
                  <SelectItem value="2">2nd Semester</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Each year has 2 semesters
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddSemester(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSemester}
                disabled={
                  isSubmitting || !newSemesterYearId || !newSemesterNumber
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? "Adding..." : "Add Semester"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Year Modal */}
      <Dialog open={showAddYear} onOpenChange={setShowAddYear}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                College
              </label>
              <Select
                value={newYearCollegeId}
                onValueChange={setNewYearCollegeId}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Year Number
                </label>
                <Select value={newYearNumber} onValueChange={setNewYearNumber}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Year Name
                </label>
                <Input
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="e.g., 1st Year"
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddYear(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddYear}
                disabled={
                  isSubmitting ||
                  !newYearName ||
                  !newYearCollegeId ||
                  !newYearNumber
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? "Adding..." : "Add Year"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add College Modal */}
      <Dialog open={showAddCollege} onOpenChange={setShowAddCollege}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New College</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                College Code
              </label>
              <Input
                value={newCollegeCode}
                onChange={(e) => setNewCollegeCode(e.target.value)}
                placeholder="e.g., LC-3"
                maxLength={10}
                className="bg-slate-50 border-slate-200 uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Full Name
              </label>
              <Input
                value={newCollegeName}
                onChange={(e) => setNewCollegeName(e.target.value)}
                placeholder="e.g., Law Centre-3"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddCollege(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCollege}
                disabled={isSubmitting || !newCollegeCode || !newCollegeName}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting ? "Adding..." : "Add College"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
