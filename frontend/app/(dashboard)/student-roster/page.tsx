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

export default function StudentRosterPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    roster,
    loading,
    colleges,
    years,
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
    if (!formData.roll_number || !formData.name) {
      alert("Roll number and name are required");
      return;
    }

    setSaving(true);

    const data = {
      form_number: formData.form_number.trim().toUpperCase() || null,
      roll_number: formData.roll_number.trim().toUpperCase(),
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
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        alert("CSV file must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["roll_number", "name"];

      for (const required of requiredHeaders) {
        if (!headers.includes(required)) {
          alert(`CSV must have a "${required}" column`);
          return;
        }
      }

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: any = {};

        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });

        if (row.roll_number && row.name) {
          data.push({
            roll_number: row.roll_number.toUpperCase(),
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            college_code: row.college_code || row.college || null,
          });
        }
      }

      setImportData(data);
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
      let college_id = null;
      if (row.college_code) {
        const college = colleges.find(
          (c) =>
            c.code.toLowerCase() === row.college_code.toLowerCase() ||
            c.name.toLowerCase() === row.college_code.toLowerCase(),
        );
        if (college) college_id = college.id;
      }

      return {
        roll_number: row.roll_number,
        name: row.name,
        email: row.email,
        phone: row.phone,
        college_id,
      };
    });

    const { error } = await supabase
      .from("student_roster")
      .upsert(dataToInsert, { onConflict: "roll_number" });

    if (error) {
      alert("Error importing data: " + error.message);
    } else {
      alert(`Successfully imported ${dataToInsert.length} entries`);
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
        sections={sections}
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        importData={importData}
        setImportData={setImportData}
        handleImport={handleImport}
        importing={importing}
      />
    </div>
  );
}
