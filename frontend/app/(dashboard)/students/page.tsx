"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/features/students/hooks/useStudents";
import { StudentTable } from "@/features/students/components/StudentTable";
import { StudentFilters } from "@/features/students/components/StudentFilters";
import { StudentModals } from "@/features/students/components/StudentModals";
import { Student } from "@/features/students/types";
import { Users, Hourglass, CheckCircle2, XCircle, Download } from "lucide-react";
import { toast } from "sonner";

export default function StudentsPage() {
  const {
    students,
    filteredStudents,
    loading,
    colleges,
    scopedColleges,
    years,
    sections,
    searchQuery,
    setSearchQuery,
    filterCollege,
    setFilterCollege,
    activeTab,
    setActiveTab,
    processing,
    setProcessing,
    fetchInitialData,
    showLoader,
    hideLoader,
    supabase,
  } = useStudents();

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingStudent, setRejectingStudent] = useState<Student | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Edit modal state
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

  const notifyStudent = async (
    telegramUserId: number | undefined | null,
    action: "approved" | "rejected",
    reason?: string,
    studentId?: string,
    whatsappId?: string,
  ) => {
    try {
      await supabase.functions.invoke("notify-student", {
        body: { telegramUserId, action, reason, studentId, whatsappId },
      });
    } catch (err) {
      console.error("Failed to notify student:", err);
    }
  };

  const approveStudent = async (student: Student) => {
    showLoader("Approving student...");
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.rpc("approve_student", {
      p_student_id: student.id,
      p_admin_id: user?.id,
    });

    if (error) {
      const { error: updateError } = await supabase
        .from("students")
        .update({
          status: "Active",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      if (updateError) {
        toast.error("Error approving student: " + updateError.message);
        setProcessing(false);
        hideLoader();
        return;
      }
    }

    notifyStudent(student.telegram_user_id, "approved", undefined, student.id, student.whatsapp_id || undefined);
    toast.success(`${student.name || "Student"} approved successfully`);
    fetchInitialData();
    setProcessing(false);
    hideLoader();
  };

  const openRejectModal = (student: Student) => {
    setRejectingStudent(student);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const rejectStudent = async () => {
    if (!rejectingStudent) return;
    setProcessing(true);
    showLoader("Rejecting student...");
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("students")
      .update({
        status: "Rejected",
        rejection_reason: rejectReason,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", rejectingStudent.id);

    if (error) {
      toast.error("Error rejecting student: " + error.message);
    } else {
      notifyStudent(rejectingStudent.telegram_user_id, "rejected", rejectReason, rejectingStudent.id, rejectingStudent.whatsapp_id || undefined);
      toast.success("Student rejected");
      fetchInitialData();
      setShowRejectModal(false);
    }
    setProcessing(false);
    hideLoader();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Blocked" : "Active";
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    setProcessing(true);
    showLoader(`Changing status to ${newStatus}...`);
    const { error } = await supabase
      .from("students")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Error updating status: " + error.message);
    } else {
      toast.success(`Status changed to ${newStatus}`);
      fetchInitialData();
    }
    setProcessing(false);
    hideLoader();
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || "",
      form_number: student.form_number || "",
      roll_number: student.roll_number || "",
      college_id: student.college_id ? student.college_id.toString() : "",
      year_id: student.year_id ? student.year_id.toString() : "",
      section_id: student.section_id ? student.section_id.toString() : "",
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    setProcessing(true);
    showLoader("Updating student...");

    const updates = {
      name: editFormData.name || null,
      form_number: editFormData.form_number || null,
      roll_number: editFormData.roll_number || null,
      college_id: editFormData.college_id ? parseInt(editFormData.college_id) : null,
      year_id: editFormData.year_id ? parseInt(editFormData.year_id) : null,
      section_id: editFormData.section_id ? parseInt(editFormData.section_id) : null,
    };

    const { error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", editingStudent.id);

    if (error) {
      toast.error("Error updating student: " + error.message);
    } else {
      toast.success("Student updated successfully");
      fetchInitialData();
      setShowEditModal(false);
    }
    setProcessing(false);
    hideLoader();
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to permanently delete ${student.name || "this student"}? This action cannot be undone.`)) return;

    setProcessing(true);
    showLoader("Deleting student...");
    
    if (student.roster_id) {
      await supabase
        .from("student_roster")
        .update({ is_claimed: false, claimed_by: null, claimed_at: null })
        .eq("id", student.roster_id);
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      toast.error("Error deleting student: " + error.message);
    } else {
      toast.success("Student deleted");
      fetchInitialData();
    }
    setProcessing(false);
    hideLoader();
  };

  const filteredYears = editFormData.college_id
    ? years.filter((y) => y.college_id === parseInt(editFormData.college_id))
    : years;

  const filteredSections = editFormData.year_id
    ? sections.filter((s) => {
        const year = years.find((y) => y.id === parseInt(editFormData.year_id));
        return year ? true : true;
      })
    : sections;

  const total = students.length;
  const pending = students.filter((s) => s.status === "Pending").length;
  const active = students.filter((s) => s.status === "Active").length;
  const blocked = students.filter((s) => s.status === "Blocked" || s.status === "Rejected").length;

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage student registrations</p>
        </div>
        <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50/50 rounded-2xl flex items-center justify-center text-indigo-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-slate-200 shadow-sm rounded-3xl ${pending > 0 ? "bg-amber-50/50 border-amber-200" : "bg-white"}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pending > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400"}`}>
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pending}</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{active}</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{blocked}</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Blocked/Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <StudentFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterCollege={filterCollege}
        setFilterCollege={setFilterCollege}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pending}
        scopedColleges={scopedColleges}
      />

      <StudentTable
        students={filteredStudents}
        loading={loading}
        activeTab={activeTab}
        processing={processing}
        onApprove={approveStudent}
        onReject={openRejectModal}
        onToggleStatus={toggleStatus}
        onEdit={openEditModal}
        onDelete={handleDeleteStudent}
      />

      <StudentModals
        showRejectModal={showRejectModal}
        setShowRejectModal={setShowRejectModal}
        rejectingStudent={rejectingStudent}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        rejectStudent={rejectStudent}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingStudent={editingStudent}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        handleUpdateStudent={handleUpdateStudent}
        processing={processing}
        colleges={colleges}
        filteredYears={filteredYears}
        filteredSections={filteredSections}
      />
    </div>
  );
}
