"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminScope } from "@/hooks/useAdminScope";

interface Student {
  id: string;
  telegram_user_id: number | null;
  whatsapp_id: string | null;
  whatsapp_name: string | null;
  telegram_username: string | null;
  roll_number: string | null;
  form_number: string | null;
  name: string | null;
  college_id: number | null;
  year_id: number | null;
  section_id: number | null;
  status: string;
  roster_id: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  joined_at: string;
  created_at: string;
  college?: { name: string };
  year?: { name: string };
  section?: { name: string };
}

export default function StudentsPage() {
  const supabase = createClient();
  const {
    admin,
    loading: adminLoading,
    isSuperAdmin,
    collegeId: adminCollegeId,
    yearId: adminYearId,
    sectionId: adminSectionId,
  } = useAdminScope();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [_filterStatus, _setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingStudent, setRejectingStudent] = useState<Student | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    form_number: "",
    roll_number: "",
    college_id: "",
    year_id: "",
    section_id: "",
  });
  const [years, setYears] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Set initial filter based on admin scope
  useEffect(() => {
    if (!adminLoading && admin && adminCollegeId) {
      setFilterCollege(adminCollegeId.toString());
    }
  }, [adminLoading, admin, adminCollegeId]);

  useEffect(() => {
    if (!adminLoading) {
      fetchInitialData();
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel("students-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchInitialData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminLoading]);

  useEffect(() => {
    filterData();
  }, [searchQuery, filterCollege, _filterStatus, students, activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);

    // Build query with admin scope filtering
    let studentsQuery = supabase
      .from("students")
      .select(
        "*, college:colleges(name), year:years(name), section:sections(name)",
      )
      .order("created_at", { ascending: false });

    // Apply admin scope filters
    if (adminSectionId) {
      studentsQuery = studentsQuery.eq("section_id", adminSectionId);
    } else if (adminYearId) {
      studentsQuery = studentsQuery.eq("year_id", adminYearId);
    } else if (adminCollegeId) {
      studentsQuery = studentsQuery.eq("college_id", adminCollegeId);
    }

    const [studentsRes, collegesRes, yearsRes, sectionsRes] = await Promise.all(
      [
        studentsQuery,
        supabase.from("colleges").select("*"),
        supabase.from("years").select("*"),
        supabase.from("sections").select("*"),
      ],
    );

    if (studentsRes.data) setStudents(studentsRes.data);
    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
    setLoading(false);
  };

  // Filter colleges based on admin scope
  const scopedColleges = useMemo(() => {
    if (isSuperAdmin || !adminCollegeId) return colleges;
    return colleges.filter((c) => c.id === adminCollegeId);
  }, [colleges, isSuperAdmin, adminCollegeId]);

  const filterData = () => {
    let filtered = [...students];

    // Filter by tab
    if (activeTab === "pending") {
      filtered = filtered.filter((s) => s.status === "Pending");
    } else if (activeTab === "active") {
      filtered = filtered.filter((s) => s.status === "Active");
    } else if (activeTab === "blocked") {
      filtered = filtered.filter(
        (s) => s.status === "Blocked" || s.status === "Rejected",
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.telegram_username
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          s.whatsapp_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.form_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (filterCollege !== "all") {
      filtered = filtered.filter(
        (s) => s.college_id?.toString() === filterCollege,
      );
    }

    if (_filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === _filterStatus);
    }

    setFilteredStudents(filtered);
  };

  const approveStudent = async (student: Student) => {
    setProcessing(true);

    // Get current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc("approve_student", {
      p_student_id: student.id,
      p_admin_id: user?.id,
    });

    if (error) {
      // Fallback to direct update if RPC not available
      const { error: updateError } = await supabase
        .from("students")
        .update({
          status: "Active",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      if (updateError) {
        alert("Error approving student: " + updateError.message);
        setProcessing(false);
        return;
      }

      // Update roster
      if (student.roster_id) {
        await supabase
          .from("student_roster")
          .update({
            is_claimed: true,
            claimed_by: student.id,
            claimed_at: new Date().toISOString(),
          })
          .eq("id", student.roster_id);
      } else if (student.roll_number) {
        // Look up roster entry by roll number and link it
        const { data: rosterEntry } = await supabase
          .from("student_roster")
          .select("id")
          .eq("roll_number", student.roll_number)
          .eq("is_claimed", false)
          .single();

        if (rosterEntry) {
          await supabase
            .from("student_roster")
            .update({
              is_claimed: true,
              claimed_by: student.id,
              claimed_at: new Date().toISOString(),
            })
            .eq("id", rosterEntry.id);

          // Link the roster entry to the student
          await supabase
            .from("students")
            .update({ roster_id: rosterEntry.id })
            .eq("id", student.id);
        }
      }
    }

    // Trigger notification to student
    await notifyStudent(student.telegram_user_id, "approved", undefined, student.id, student.whatsapp_id || undefined);

    setProcessing(false);
    fetchInitialData();
  };

  const openRejectModal = (student: Student) => {
    setRejectingStudent(student);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const rejectStudent = async () => {
    if (!rejectingStudent) return;

    setProcessing(true);

    // Get current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc("reject_student", {
      p_student_id: rejectingStudent.id,
      p_admin_id: user?.id,
      p_reason: rejectReason || null,
    });

    if (error) {
      // Fallback to direct update if RPC not available
      const { error: updateError } = await supabase
        .from("students")
        .update({
          status: "Rejected",
          rejection_reason: rejectReason || null,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          roster_id: null,
        })
        .eq("id", rejectingStudent.id);

      if (updateError) {
        alert("Error rejecting student: " + updateError.message);
        setProcessing(false);
        return;
      }

      // Free up roster entry
      if (rejectingStudent.roster_id) {
        await supabase
          .from("student_roster")
          .update({
            is_claimed: false,
            claimed_by: null,
            claimed_at: null,
          })
          .eq("id", rejectingStudent.roster_id);
      }
    }

    // Trigger notification to student
    await notifyStudent(
      rejectingStudent.telegram_user_id,
      "rejected",
      rejectReason,
      rejectingStudent.id,
      rejectingStudent.whatsapp_id || undefined,
    );

    setProcessing(false);
    setShowRejectModal(false);
    setRejectingStudent(null);
    fetchInitialData();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Blocked" : "Active";
    const { error } = await supabase
      .from("students")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setStudents(
        students.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
      );
    } else {
      alert("Error updating status");
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || "",
      form_number: student.form_number || "",
      roll_number: student.roll_number || "",
      college_id: student.college_id?.toString() || "",
      year_id: student.year_id?.toString() || "",
      section_id: student.section_id?.toString() || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    setProcessing(true);

    const updateData: any = {
      name: editFormData.name.trim() || null,
      form_number: editFormData.form_number.trim() || null,
      roll_number: editFormData.roll_number.trim() || null,
      college_id: editFormData.college_id
        ? parseInt(editFormData.college_id)
        : null,
      year_id: editFormData.year_id ? parseInt(editFormData.year_id) : null,
      section_id: editFormData.section_id
        ? parseInt(editFormData.section_id)
        : null,
    };

    const { error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", editingStudent.id);

    if (error) {
      alert("Error updating student: " + error.message);
    } else {
      setShowEditModal(false);
      setEditingStudent(null);
      fetchInitialData();
    }

    setProcessing(false);
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmMessage = student.roster_id
      ? `Are you sure you want to delete ${student.name || "this student"}? This will also free up their roster entry.`
      : `Are you sure you want to delete ${student.name || "this student"}?`;

    if (!confirm(confirmMessage)) return;

    setProcessing(true);

    // If student has a roster entry, free it up first
    if (student.roster_id) {
      await supabase
        .from("student_roster")
        .update({
          is_claimed: false,
          claimed_by: null,
          claimed_at: null,
        })
        .eq("id", student.roster_id);
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      alert("Error deleting student: " + error.message);
    } else {
      fetchInitialData();
    }

    setProcessing(false);
  };

  // Get filtered years and sections for the edit form
  const filteredYears = editFormData.college_id
    ? years.filter((y) => y.college_id === parseInt(editFormData.college_id))
    : years;

  const filteredSections = editFormData.year_id
    ? sections.filter((s) => {
        // Find semesters for the selected year
        const year = years.find((y) => y.id === parseInt(editFormData.year_id));
        return year ? true : true; // Show all sections for now
      })
    : sections;

  const notifyStudent = async (
    telegramUserId: number | undefined | null,
    action: "approved" | "rejected",
    reason?: string,
    studentId?: string,
    whatsappId?: string,
  ) => {
    try {
      // Call the notification edge function
      await supabase.functions.invoke("notify-student", {
        body: { telegramUserId, action, reason, studentId, whatsappId },
      });
    } catch (err) {
      console.error("Failed to notify student:", err);
    }
  };

  // Stats calculation
  const total = students.length;
  const pending = students.filter((s) => s.status === "Pending").length;
  const active = students.filter((s) => s.status === "Active").length;
  const blocked = students.filter(
    (s) => s.status === "Blocked" || s.status === "Rejected",
  ).length;

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Blocked":
        return "bg-red-50 text-red-700 border-red-100";
      case "Rejected":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Student Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and manage student registrations
          </p>
        </div>
        <Button
          variant="outline"
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          📥 Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
              👥
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Total
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-slate-200 shadow-sm ${pending > 0 ? "bg-amber-50 border-amber-200" : "bg-white"}`}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${pending > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-500"}`}
            >
              ⏳
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{pending}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Pending
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              ✅
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{active}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              🚫
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{blocked}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Blocked/Rejected
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Active Students</TabsTrigger>
          <TabsTrigger value="blocked">Blocked/Rejected</TabsTrigger>
          <TabsTrigger value="all">All Students</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-6">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, Telegram, WhatsApp, or form/roll number..."
            className="max-w-sm bg-white border-slate-200"
          />
          {/* Only show college filter if admin has access to multiple colleges */}
          {scopedColleges.length > 1 && (
            <Select value={filterCollege} onValueChange={setFilterCollege}>
              <SelectTrigger className="w-[180px] bg-white border-slate-200">
                <SelectValue placeholder="All Colleges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {scopedColleges.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table Content for all tabs */}
        <TabsContent value={activeTab} className="mt-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-8 text-slate-500"
                      >
                        Loading students...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-8 text-slate-500"
                      >
                        {activeTab === "pending"
                          ? "No pending approvals"
                          : "No students found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        className="hover:bg-slate-50/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 bg-slate-100 border border-slate-200">
                              <AvatarFallback className="text-slate-600 text-xs font-medium">
                                {student.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-slate-900">
                              {student.name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {student.form_number || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {student.roll_number || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {student.whatsapp_id ? (
                            <span className="text-emerald-600">
                              WA: {student.whatsapp_name || student.whatsapp_id}
                            </span>
                          ) : student.telegram_username ? (
                            <span className="text-blue-600">
                              TG: @{student.telegram_username}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {student.college?.name ? (
                            <Badge
                              variant="outline"
                              className="font-normal text-slate-600 bg-white border-slate-200"
                            >
                              {student.college.name}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {student.year?.name || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {student.section?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`font-normal ${getStatusBadgeStyle(student.status)} border`}
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {new Date(student.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {student.status === "Pending" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => approveStudent(student)}
                                  disabled={processing}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  ✓ Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRejectModal(student)}
                                  disabled={processing}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  ✗ Reject
                                </Button>
                              </>
                            ) : student.status === "Active" ||
                              student.status === "Blocked" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  toggleStatus(student.id, student.status)
                                }
                                className={
                                  student.status === "Active"
                                    ? "text-slate-400 hover:text-red-600"
                                    : "text-slate-400 hover:text-emerald-600"
                                }
                              >
                                {student.status === "Active"
                                  ? "🚫 Block"
                                  : "✅ Unblock"}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {student.rejection_reason
                                  ? `Reason: ${student.rejection_reason.substring(0, 20)}...`
                                  : "Rejected"}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(student)}
                              disabled={processing}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStudent(student)}
                              disabled={processing}
                              className="text-slate-400 hover:text-red-600"
                            >
                              🗑️
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to reject the registration for{" "}
              <strong>{rejectingStudent?.name}</strong>(
              {rejectingStudent?.roll_number})?
            </p>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={3}
              />
              <p className="text-xs text-slate-500">
                This reason will be shown to the student.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={rejectStudent}
              disabled={processing}
            >
              {processing ? "Rejecting..." : "Reject Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Name</Label>
                <Input
                  id="edit_name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  placeholder="Student name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_form_number">Form Number</Label>
                <Input
                  id="edit_form_number"
                  value={editFormData.form_number}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      form_number: e.target.value,
                    })
                  }
                  placeholder="Form number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_roll_number">Roll Number</Label>
                <Input
                  id="edit_roll_number"
                  value={editFormData.roll_number}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      roll_number: e.target.value,
                    })
                  }
                  placeholder="Roll number"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>College</Label>
                <Select
                  value={editFormData.college_id || "__none__"}
                  onValueChange={(v) =>
                    setEditFormData({
                      ...editFormData,
                      college_id: v === "__none__" ? "" : v,
                      year_id: "",
                      section_id: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={editFormData.year_id || "__none__"}
                  onValueChange={(v) =>
                    setEditFormData({
                      ...editFormData,
                      year_id: v === "__none__" ? "" : v,
                      section_id: "",
                    })
                  }
                  disabled={!editFormData.college_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
                  value={editFormData.section_id || "__none__"}
                  onValueChange={(v) =>
                    setEditFormData({
                      ...editFormData,
                      section_id: v === "__none__" ? "" : v,
                    })
                  }
                  disabled={!editFormData.year_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {filteredSections.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingStudent && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg space-y-1">
                <p>
                  <strong>Telegram:</strong>{" "}
                  {editingStudent.telegram_username
                    ? `@${editingStudent.telegram_username}`
                    : `ID: ${editingStudent.telegram_user_id}`}
                </p>
                <p>
                  <strong>Status:</strong> {editingStudent.status}
                </p>
                <p>
                  <strong>Joined:</strong>{" "}
                  {new Date(editingStudent.joined_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStudent} disabled={processing}>
              {processing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
