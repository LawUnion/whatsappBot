"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStudentRoster } from "@/features/student-roster/hooks/useStudentRoster";
import { RosterFilters } from "@/features/student-roster/components/RosterFilters";
import { RosterTable } from "@/features/student-roster/components/RosterTable";
import { RosterModals } from "@/features/student-roster/components/RosterModals";
import { RosterEntry } from "@/features/student-roster/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function StudentRosterPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSemesterId, setImportSemesterId] = useState("");

  const [existingImportKeys, setExistingImportKeys] = useState<Set<string>>(new Set());
  const [importConflictAction, setImportConflictAction] = useState<"overwrite" | "skip">("overwrite");

  const {
    roster,
    loading,
    colleges,
    years,
    semesters,
    sections,
    currentPage,
    setCurrentPage,
    totalCount,
    claimedCount,
    pageSize,
    searchQuery,
    setSearchQuery,
    filterCollege,
    setFilterCollege,
    filterYear,
    setFilterYear,
    filterSection,
    setFilterSection,
    filterClaimed,
    setFilterClaimed,
    fetchRoster,
    fetchMetadata,
    handleDelete,
    handleUnclaim,
  } = useStudentRoster();

  // Add/Edit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [formData, setFormData] = useState({
    form_number: "",
    roll_number: "",
    name: "",
    college_id: "",
    year_id: "",
    section_id: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  
  const [importCollegeId, setImportCollegeId] = useState("");
  const [importYearId, setImportYearId] = useState("");
  const [importSectionId, setImportSectionId] = useState("");

  const openAddModal = () => {
    setEditingEntry(null);
    setFormData({
      form_number: "",
      roll_number: "",
      name: "",
      college_id: "",
      year_id: "",
      section_id: "",
      email: "",
      phone: "",
    });
    setShowAddModal(true);
  };

  const openEditModal = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setFormData({
      form_number: entry.form_number || "",
      roll_number: entry.roll_number,
      name: entry.name,
      college_id: entry.college_id?.toString() || "",
      year_id: entry.year_id?.toString() || "",
      section_id: entry.section_id?.toString() || "",
      email: entry.email || "",
      phone: entry.phone || "",
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert("Name is required");
      return;
    }
    
    if (!formData.roll_number && !formData.form_number) {
      alert("Either Roll Number or Form Number is required");
      return;
    }

    setSaving(true);

    const data = {
      form_number: formData.form_number.trim().toUpperCase() || null,
      roll_number: formData.roll_number.trim().toUpperCase() || null,
      name: formData.name.trim(),
      college_id: formData.college_id ? parseInt(formData.college_id) : null,
      year_id: formData.year_id ? parseInt(formData.year_id) : null,
      section_id: formData.section_id ? parseInt(formData.section_id) : null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
    };

    if (editingEntry) {
      const { error } = await supabase
        .from("student_roster")
        .update(data)
        .eq("id", editingEntry.id);

      if (error) {
        alert("Error updating entry: " + error.message);
      } else {
        setShowAddModal(false);
        fetchRoster();
        fetchMetadata();
      }
    } else {
      const { error } = await supabase.from("student_roster").insert(data);

      if (error) {
        if (error.code === "23505") {
          alert("Roll number already exists in the roster");
        } else {
          alert("Error adding entry: " + error.message);
        }
      } else {
        setShowAddModal(false);
        fetchRoster();
        fetchMetadata();
      }
    }

    setSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        alert("CSV file must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["name"];

      for (const required of requiredHeaders) {
        if (!headers.includes(required)) {
          alert(`CSV must have a "${required}" column`);
          return;
        }
      }

      if (!headers.includes("form_number") && !headers.includes("roll_number")) {
        alert("CSV must have either a 'form_number' or 'roll_number' column");
        return;
      }

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: any = {};

        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });

        if ((row.roll_number || row.form_number) && row.name) {
          data.push({
            form_number: row.form_number ? row.form_number.toUpperCase() : null,
            roll_number: row.roll_number ? row.roll_number.toUpperCase() : null,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            college_code: row.college_code || row.college || null,
            section_name: row.section || row.section_name || null,
          });
        }
      }

      // Pre-check for database duplicates
      let existingKeysSet = new Set<string>();
      if (data.length > 0) {
        const onConflictCol = data[0]?.form_number ? "form_number" : "roll_number";
        const keysToCheck = data.map((d: any) => d[onConflictCol]).filter(Boolean);
        
        if (keysToCheck.length > 0) {
          const { data: existingRecords } = await supabase
            .from("student_roster")
            .select(onConflictCol)
            .in(onConflictCol, keysToCheck);
            
          if (existingRecords) {
            existingKeysSet = new Set(existingRecords.map((r: any) => r[onConflictCol]));
          }
        }
      }

      setExistingImportKeys(existingKeysSet);
      setImportConflictAction("overwrite");
      setImportData(data);
      setImportCollegeId("");
      setImportYearId("");
      setImportSemesterId("");
      setShowImportModal(true);
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;

    setImporting(true);

    const dataToInsert = importData.map((row) => {
      let college_id = importCollegeId ? parseInt(importCollegeId) : null;
      if (!college_id && row.college_code) {
        const college = colleges.find(
          (c) =>
            c.code.toLowerCase() === row.college_code.toLowerCase() ||
            c.name.toLowerCase() === row.college_code.toLowerCase(),
        );
        if (college) college_id = college.id;
      }

      let section_id = null;
      if (importSemesterId && row.section_name) {
        const matchedSection = sections.find(
          (s) =>
            s.semester_id.toString() === importSemesterId &&
            s.name.toUpperCase() === row.section_name.toUpperCase()
        );
        if (matchedSection) section_id = matchedSection.id;
      }

      return {
        form_number: row.form_number,
        roll_number: row.roll_number,
        name: row.name,
        email: row.email,
        phone: row.phone,
        college_id,
        year_id: importYearId ? parseInt(importYearId) : null,
        section_id: section_id,
        section_name: row.section_name ? row.section_name.toUpperCase() : null,
      };
    });

    const onConflictCol = importData[0]?.form_number ? "form_number" : "roll_number";

    // Detect internal duplicates and keep only unique values
    const uniqueDataMap = new Map();
    for (const item of dataToInsert) {
      const key = item[onConflictCol];
      if (key) {
        uniqueDataMap.set(key, item);
      }
    }
    let deduplicatedDataToInsert = Array.from(uniqueDataMap.values());

    if (importConflictAction === "skip" && existingImportKeys.size > 0) {
       deduplicatedDataToInsert = deduplicatedDataToInsert.filter(
         (d: any) => !existingImportKeys.has(d[onConflictCol])
       );
    }

    if (deduplicatedDataToInsert.length === 0) {
      toast.success("No new records to import.");
      setImporting(false);
      setShowImportModal(false);
      setImportData([]);
      return;
    }

    const { error } = await supabase
      .from("student_roster")
      .upsert(deduplicatedDataToInsert, { onConflict: onConflictCol });

    if (error) {
      alert("Error importing data: " + error.message);
    } else {
      toast.success("Data imported successfully");
      setShowImportModal(false);
      setImportData([]);
      fetchRoster();
      fetchMetadata();
    }
    setImporting(false);
  };

  const total = totalCount;
  const claimed = claimedCount;
  const available = total - claimed;

  const totalPages = Math.ceil(totalCount / pageSize);
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Student Roster
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-loaded list of valid students for registration verification
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => fileInputRef.current?.click()}
          >
            📤 Import CSV
          </Button>
          <Button
            className="bg-slate-900 text-white hover:bg-slate-800"
            onClick={openAddModal}
          >
            + Add Student
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
              📋
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Total in Roster
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              ✓
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {available}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Available
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              👤
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{claimed}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Claimed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <RosterFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterCollege={filterCollege}
        setFilterCollege={setFilterCollege}
        filterYear={filterYear}
        setFilterYear={setFilterYear}
        filterSection={filterSection}
        setFilterSection={setFilterSection}
        filterClaimed={filterClaimed}
        setFilterClaimed={setFilterClaimed}
        colleges={colleges}
        years={years}
      />

      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <RosterTable
            roster={roster}
            loading={loading}
            totalCount={totalCount}
            handleUnclaim={handleUnclaim}
            openEditModal={openEditModal}
            handleDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {showingFrom} to {showingTo} of {totalCount} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              className="border-slate-200"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="border-slate-200"
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="border-slate-200"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="border-slate-200"
            >
              Last
            </Button>
          </div>
        </div>
      )}

      <RosterModals
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        editingEntry={editingEntry}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        saving={saving}
        colleges={colleges}
        years={years}
        semesters={semesters}
        sections={sections}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        importData={importData}
        setImportData={setImportData}
        handleImport={handleImport}
        importing={importing}
        importCollegeId={importCollegeId}
        setImportCollegeId={setImportCollegeId}
        importYearId={importYearId}
        setImportYearId={setImportYearId}
        importSemesterId={importSemesterId}
        setImportSemesterId={setImportSemesterId}
        importSectionId={importSectionId}
        setImportSectionId={setImportSectionId}
        existingImportKeys={existingImportKeys}
        importConflictAction={importConflictAction}
        setImportConflictAction={setImportConflictAction}
      />
    </div>
  );
}
