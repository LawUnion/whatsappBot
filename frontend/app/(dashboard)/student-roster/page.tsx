"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface RosterEntry {
  id: string;
  form_number: string | null;
  roll_number: string;
  name: string;
  college_id: number | null;
  year_id: number | null;
  section_id: number | null;
  section_name: string | null;
  email: string | null;
  phone: string | null;
  is_claimed: boolean;
  claimed_by: string | null;
  created_at: string;
  college?: { name: string };
  year?: { name: string };
  section?: { name: string };
}

interface College {
  id: number;
  name: string;
  code: string;
}

interface Year {
  id: number;
  name: string;
  college_id: number;
}

interface Section {
  id: number;
  name: string;
  semester_id: number;
}

export default function StudentRosterPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState<College[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);
  const pageSize = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterClaimed, setFilterClaimed] = useState("all");

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

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCollege, filterYear, filterSection, filterClaimed]);

  // Reset year and section when college changes
  useEffect(() => {
    setFilterYear("all");
    setFilterSection("all");
  }, [filterCollege]);

  // Reset section when year changes
  useEffect(() => {
    setFilterSection("all");
  }, [filterYear]);

  useEffect(() => {
    fetchRoster();
  }, [
    currentPage,
    debouncedSearch,
    filterCollege,
    filterYear,
    filterSection,
    filterClaimed,
  ]);

  useEffect(() => {
    // Filter years based on selected college
    if (formData.college_id) {
      const filteredYears = years.filter(
        (y) => y.college_id === parseInt(formData.college_id),
      );
      if (
        filteredYears.length > 0 &&
        !filteredYears.find((y) => y.id.toString() === formData.year_id)
      ) {
        setFormData((prev) => ({ ...prev, year_id: "", section_id: "" }));
      }
    }
  }, [formData.college_id, years]);

  const fetchMetadata = async () => {
    const [collegesRes, yearsRes, sectionsRes, totalRes, claimedRes] =
      await Promise.all([
        supabase.from("colleges").select("*"),
        supabase.from("years").select("*"),
        supabase.from("sections").select("*"),
        supabase
          .from("student_roster")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("student_roster")
          .select("*", { count: "exact", head: true })
          .eq("is_claimed", true),
      ]);

    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
    if (totalRes.count !== null) setTotalCount(totalRes.count);
    if (claimedRes.count !== null) setClaimedCount(claimedRes.count);
  };

  const fetchRoster = async () => {
    setLoading(true);

    // Build query with filters
    let query = supabase
      .from("student_roster")
      .select(
        "*, college:colleges(name), year:years(name), section:sections(name)",
        { count: "exact" },
      );

    // Apply filters
    if (debouncedSearch) {
      query = query.or(
        `name.ilike.%${debouncedSearch}%,roll_number.ilike.%${debouncedSearch}%,form_number.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`,
      );
    }

    if (filterCollege !== "all") {
      query = query.eq("college_id", parseInt(filterCollege));
    }

    if (filterYear !== "all") {
      query = query.eq("year_id", parseInt(filterYear));
    }

    if (filterSection !== "all") {
      query = query.eq("section_name", filterSection);
    }

    if (filterClaimed !== "all") {
      query = query.eq("is_claimed", filterClaimed === "claimed");
    }

    // Apply pagination
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order("roll_number", { ascending: true })
      .range(from, to);

    if (data) setRoster(data);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this roster entry?")) return;

    const { error } = await supabase
      .from("student_roster")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error deleting entry: " + error.message);
    } else {
      fetchRoster();
      fetchMetadata();
    }
  };

  const handleUnclaim = async (entry: RosterEntry) => {
    if (!confirm(`Are you sure you want to unlink ${entry.name} from their claimed account?`)) return;

    setLoading(true);

    // First free the student record
    const { error: studentError } = await supabase
      .from("students")
      .update({ roster_id: null, status: "Pending" })
      .eq("roster_id", entry.id);

    if (studentError) {
      alert("Error updating student record: " + studentError.message);
      setLoading(false);
      return;
    }

    // Then update the roster entry
    const { error: rosterError } = await supabase
      .from("student_roster")
      .update({ is_claimed: false, claimed_by: null })
      .eq("id", entry.id);

    if (rosterError) {
      alert("Error unclaiming roster entry: " + rosterError.message);
    } else {
      fetchRoster();
      fetchMetadata();
    }
    
    setLoading(false);
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

    // Map college codes to IDs
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

  // Stats - use counts from metadata
  const total = totalCount;
  const claimed = claimedCount;
  const available = total - claimed;

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalCount);

  // Get filtered years and sections for the form
  const filteredYears = formData.college_id
    ? years.filter((y) => y.college_id === parseInt(formData.college_id))
    : [];

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
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

      {/* Stats */}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, roll number, or email..."
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
        <Select
          value={filterYear}
          onValueChange={setFilterYear}
          disabled={filterCollege === "all"}
        >
          <SelectTrigger className="w-[150px] bg-white border-slate-200">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years
              .filter(
                (y) =>
                  filterCollege === "all" ||
                  y.college_id === parseInt(filterCollege),
              )
              .map((y) => (
                <SelectItem key={y.id} value={y.id.toString()}>
                  {y.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-[150px] bg-white border-slate-200">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select value={filterClaimed} onValueChange={setFilterClaimed}>
          <SelectTrigger className="w-[150px] bg-white border-slate-200">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery ||
          filterCollege !== "all" ||
          filterYear !== "all" ||
          filterSection !== "all" ||
          filterClaimed !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterCollege("all");
              setFilterYear("all");
              setFilterSection("all");
              setFilterClaimed("all");
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Roster Table */}
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Form Number</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-slate-500"
                  >
                    Loading roster...
                  </TableCell>
                </TableRow>
              ) : roster.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-slate-500"
                  >
                    {totalCount === 0
                      ? "No students in roster. Add students or import a CSV file."
                      : "No matching entries found"}
                  </TableCell>
                </TableRow>
              ) : (
                roster.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-sm font-medium text-slate-900">
                      {entry.form_number || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-slate-900">
                      {entry.roll_number}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {entry.name}
                    </TableCell>
                    <TableCell>
                      {entry.college?.name ? (
                        <Badge
                          variant="outline"
                          className="font-normal text-slate-600 bg-white border-slate-200"
                        >
                          {entry.college.name}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {entry.year?.name || "-"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {entry.section_name || entry.section?.name || "-"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {entry.email || "-"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {entry.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`font-normal ${
                          entry.is_claimed
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        } border`}
                      >
                        {entry.is_claimed ? "Claimed" : "Available"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.is_claimed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnclaim(entry)}
                          className="text-slate-400 hover:text-amber-600"
                          title="Unlink claimed record"
                        >
                          🔗 Unlink
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(entry)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Edit"
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            className="text-slate-400 hover:text-red-600"
                            title="Delete"
                          >
                            🗑️
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Roster Entry" : "Add Student to Roster"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form_number">Form Number</Label>
                <Input
                  id="form_number"
                  value={formData.form_number}
                  onChange={(e) =>
                    setFormData({ ...formData, form_number: e.target.value })
                  }
                  placeholder="DUPG12345"
                  disabled={!!editingEntry && !!editingEntry.form_number}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roll_number">Roll Number *</Label>
                <Input
                  id="roll_number"
                  value={formData.roll_number}
                  onChange={(e) =>
                    setFormData({ ...formData, roll_number: e.target.value })
                  }
                  placeholder="2023/LC1/001"
                  disabled={!!editingEntry}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>College</Label>
                <Select
                  value={formData.college_id}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      college_id: v,
                      year_id: "",
                      section_id: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={formData.year_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, year_id: v, section_id: "" })
                  }
                  disabled={!formData.college_id}
                >
                  <SelectTrigger>
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
                <Label>Section</Label>
                <Select
                  value={formData.section_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, section_id: v })
                  }
                  disabled={!formData.year_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="student@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingEntry ? "Update" : "Add to Roster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Found {importData.length} entries to import. Review the data
              below:
            </p>
            <div className="max-h-[300px] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {row.roll_number}
                      </TableCell>
                      <TableCell className="text-sm">{row.name}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {row.email || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {importData.length > 10 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-slate-500 text-sm"
                      >
                        ...and {importData.length - 10} more entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              * Existing entries with the same roll number will be updated
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportData([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing
                ? "Importing..."
                : `Import ${importData.length} Entries`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
