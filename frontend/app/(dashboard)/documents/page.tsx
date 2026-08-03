"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Modules that have documents
const MODULES = [
  "All",
  "Schedule",
  "Notices",
  "Societies",
  "Study Material",
  "Events",
  "Internships",
];

interface DocumentFile {
  id: string;
  title: string;
  module: string;
  file_url: string;
  college_id: number | null;
  created_at: string;
  admin_name: string;
  college_code: string | null;
}

interface College {
  id: number;
  code: string;
  name: string;
}

interface NoticeData {
  id: string;
  title: string;
  file_url: string;
  college_id: number | null;
  created_at: string;
  admin?: { name: string } | { name: string }[] | null;
  college?: { code: string } | { code: string }[] | null;
}

interface StudyMaterialData {
  id: string;
  subject: string;
  topic: string;
  file_url: string;
  college_id: number | null;
  created_at: string;
  admin?: { name: string } | { name: string }[] | null;
  college?: { code: string } | { code: string }[] | null;
}

interface ScheduleNoteData {
  id: string;
  subject: string;
  topic: string;
  file_url: string;
  created_at: string;
  admin?: { name: string } | { name: string }[] | null;
}

export default function DocumentsPage() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("All");
  const [filterCollege, setFilterCollege] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all document sources
    const [notices, studyMaterials, scheduleNotes, collegesRes] =
      await Promise.all([
        supabase
          .from("notices")
          .select(
            "id, title, file_url, college_id, created_at, admin:admins(name), college:colleges(code)",
          )
          .not("file_url", "is", null),
        supabase
          .from("study_materials")
          .select(
            "id, subject, topic, file_url, college_id, created_at, admin:admins(name), college:colleges(code)",
          )
          .not("file_url", "is", null),
        supabase
          .from("schedule_notes")
          .select(
            "id, subject, topic, file_url, created_at, admin:admins(name)",
          )
          .not("file_url", "is", null),
        supabase.from("colleges").select("*"),
      ]);

    const docs: DocumentFile[] = [];

    // Helper to safely get name from admin relation (can be object or array)
    const getAdminName = (
      admin: { name: string } | { name: string }[] | null | undefined,
    ): string => {
      if (!admin) return "Unknown";
      if (Array.isArray(admin)) return admin[0]?.name || "Unknown";
      return admin.name || "Unknown";
    };

    // Helper to safely get code from college relation
    const getCollegeCode = (
      college: { code: string } | { code: string }[] | null | undefined,
    ): string | null => {
      if (!college) return null;
      if (Array.isArray(college)) return college[0]?.code || null;
      return college.code || null;
    };

    // Add notices
    ((notices.data || []) as NoticeData[]).forEach((n) => {
      docs.push({
        id: n.id,
        title: n.title,
        module: "Notices",
        file_url: n.file_url,
        college_id: n.college_id,
        created_at: n.created_at,
        admin_name: getAdminName(n.admin),
        college_code: getCollegeCode(n.college),
      });
    });

    // Add study materials
    ((studyMaterials.data || []) as StudyMaterialData[]).forEach((m) => {
      docs.push({
        id: m.id,
        title: m.topic || m.subject,
        module: "Study Material",
        file_url: m.file_url,
        college_id: m.college_id,
        created_at: m.created_at,
        admin_name: getAdminName(m.admin),
        college_code: getCollegeCode(m.college),
      });
    });

    // Add schedule notes
    ((scheduleNotes.data || []) as ScheduleNoteData[]).forEach((s) => {
      docs.push({
        id: s.id,
        title: s.topic || s.subject,
        module: "Schedule",
        file_url: s.file_url,
        college_id: null,
        created_at: s.created_at,
        admin_name: getAdminName(s.admin),
        college_code: null,
      });
    });

    // Sort by date
    docs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setDocuments(docs);
    if (collegesRes.data) setColleges(collegesRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchModule = filterModule === "All" || doc.module === filterModule;
      const matchCollege =
        filterCollege === "All" ||
        doc.college_code === filterCollege ||
        (!doc.college_code && filterCollege === "Faculty");
      const matchSearch =
        searchTerm === "" ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_url.toLowerCase().includes(searchTerm.toLowerCase());
      return matchModule && matchCollege && matchSearch;
    });
  }, [documents, filterModule, filterCollege, searchTerm]);

  const getFileType = (url: string) => {
    if (url.includes(".pdf")) return "PDF";
    if (url.includes(".doc")) return "DOC";
    if (url.includes(".jpg") || url.includes(".png") || url.includes(".jpeg"))
      return "IMG";
    return "LINK";
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return "📄";
      case "DOC":
        return "📝";
      case "IMG":
        return "🖼️";
      default:
        return "🔗";
    }
  };

  // Delete document from its source table
  const handleDelete = async (doc: DocumentFile) => {
    if (
      !confirm(
        `Delete "${doc.title}" from ${doc.module}? This cannot be undone.`,
      )
    )
      return;

    // Map module to table name
    const tableMap: Record<string, string> = {
      Notices: "notices",
      "Study Material": "study_materials",
      Schedule: "schedule_notes",
    };

    const tableName = tableMap[doc.module];
    if (!tableName) {
      toast.error("Cannot delete this document type");
      return;
    }

    const { error } = await supabase.from(tableName).delete().eq("id", doc.id);

    if (error) {
      toast.error("Error deleting document: " + error.message);
    } else {
      toast.success("Document deleted successfully");
      fetchData();
    }
  };

  // Calculate storage (mock)
  const storageUsed = documents.length * 0.8; // rough estimate in MB
  const storagePercent = Math.min((storageUsed / 5000) * 100, 100);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            📁 Document Cloud
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit and manage all uploaded files across modules
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">
              System Storage
            </p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-800">
                {(storageUsed / 1000).toFixed(1)} / 5 GB
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Filter by Module
                </label>
                <div className="flex flex-col gap-1">
                  {MODULES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterModule(m)}
                      className={`text-left px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        filterModule === m
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Campus Scope
                </label>
                <Select value={filterCollege} onValueChange={setFilterCollege}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All Campuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Campuses</SelectItem>
                    <SelectItem value="Faculty">Faculty-Wide</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase mb-1">
                    Audit Control
                  </p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    As Super Admin, you can revoke any file to immediately block
                    it on the student bot.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Explorer */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <Input
                type="text"
                placeholder="Search by filename, title, or admin name..."
                className="pl-11 bg-slate-50 border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Documents Table */}
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="py-20 text-center text-slate-500">
                  Loading documents...
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Document Details</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Campus</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16">
                          <div className="text-4xl mb-4 grayscale opacity-20">
                            ☁️
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            No matching documents found
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocs.map((doc) => {
                        const fileType = getFileType(doc.file_url);
                        return (
                          <TableRow
                            key={`${doc.module}-${doc.id}`}
                            className="hover:bg-slate-50/50 group"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                                    fileType === "PDF"
                                      ? "bg-rose-50 text-rose-500 border-rose-100"
                                      : fileType === "IMG"
                                        ? "bg-blue-50 text-blue-500 border-blue-100"
                                        : "bg-slate-50 text-slate-500 border-slate-100"
                                  } border`}
                                >
                                  {getFileIcon(fileType)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                                    {doc.title}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono italic truncate max-w-[200px]">
                                    {doc.file_url.split("/").pop() ||
                                      doc.file_url}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs font-semibold text-slate-600">
                                {doc.admin_name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-indigo-50 text-indigo-600 border-indigo-100"
                              >
                                {doc.module}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-white border-slate-200"
                              >
                                {doc.college_code || "Faculty"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-indigo-600"
                                  >
                                    ⬇️
                                  </Button>
                                </a>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-rose-600"
                                  onClick={() => handleDelete(doc)}
                                >
                                  🗑️
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
