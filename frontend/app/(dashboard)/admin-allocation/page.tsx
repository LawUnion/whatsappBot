"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminRole } from "@/lib/types";
import { useAdminScope } from "@/hooks/useAdminScope";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  first_login: boolean;
  college_id?: number;
  year_id?: number;
  section_id?: number;
  society_id?: number;
  college?: { code: string; name: string };
  year?: { name: string };
  section?: { name: string };
  society?: { name: string };
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

interface Section {
  id: number;
  name: string;
  semester?: { year_id: number };
}

interface Society {
  id: number;
  name: string;
  college_id: number;
}

export default function AdminAllocationPage() {
  const supabase = createClient();
  const { isSuperAdmin } = useAdminScope();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAdminId, setResetAdminId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterCollege, setFilterCollege] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  // New Admin Form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>(AdminRole.SECTION_ADMIN);
  const [newCollegeId, setNewCollegeId] = useState("");
  const [newYearId, setNewYearId] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const [newSocietyId, setNewSocietyId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [adminsRes, collegesRes, yearsRes, sectionsRes, societiesRes] =
      await Promise.all([
        supabase
          .from("admins")
          .select(
            "*, college:colleges(code, name), year:years(name), section:sections(name), society:societies(name)",
          )
          .order("created_at", { ascending: false }),
        supabase.from("colleges").select("*"),
        supabase.from("years").select("*"),
        supabase.from("sections").select("*, semester:semesters(year_id)"),
        supabase.from("societies").select("*"),
      ]);

    if (adminsRes.data) setAdmins(adminsRes.data);
    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
    if (societiesRes.data) setSocieties(societiesRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter years by college
  const availableYears = useMemo(
    () => years.filter((y) => y.college_id === parseInt(newCollegeId)),
    [years, newCollegeId],
  );

  // Filter sections by year (deduplicate by name to avoid duplicates from multiple semesters)
  const availableSections = useMemo(() => {
    const yearSections = sections.filter(
      (s) => s.semester?.year_id === parseInt(newYearId),
    );
    const seen = new Set<string>();
    return yearSections.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [sections, newYearId]);

  // Filter societies by college
  const availableSocieties = useMemo(
    () => societies.filter((s) => s.college_id === parseInt(newCollegeId)),
    [societies, newCollegeId],
  );

  // Role-based field visibility
  const showCollege = [
    AdminRole.SECTION_ADMIN,
    AdminRole.NOTICES_ADMIN,
    AdminRole.SOCIETIES_ADMIN,
    AdminRole.STUDY_MATERIAL_ADMIN,
    AdminRole.EVENTS_ADMIN,
    AdminRole.INTERNSHIP_ADMIN,
    AdminRole.COLLEGE_CONTENT_ADMIN,
  ].includes(newRole);

  const showYear = [
    AdminRole.SECTION_ADMIN,
    AdminRole.STUDY_MATERIAL_ADMIN,
  ].includes(newRole);

  const showSection = newRole === AdminRole.SECTION_ADMIN;
  const showSociety = newRole === AdminRole.SOCIETIES_ADMIN;

  // Filtered admins based on search, role, college, and status
  const filteredAdmins = useMemo(() => {
    let filtered = [...admins];

    // Filter by tab (status)
    if (activeTab === "active") {
      filtered = filtered.filter((a) => a.active);
    } else if (activeTab === "revoked") {
      filtered = filtered.filter((a) => !a.active);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name?.toLowerCase().includes(query) ||
          a.email?.toLowerCase().includes(query),
      );
    }

    // Filter by role
    if (filterRole !== "all") {
      filtered = filtered.filter((a) => a.role === filterRole);
    }

    // Filter by college
    if (filterCollege !== "all") {
      filtered = filtered.filter(
        (a) => a.college_id?.toString() === filterCollege,
      );
    }

    return filtered;
  }, [admins, searchQuery, filterRole, filterCollege, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.active).length;
    const revoked = admins.filter((a) => !a.active).length;
    const superAdmins = admins.filter(
      (a) => a.role === AdminRole.SUPER_ADMIN,
    ).length;
    const roleBreakdown = Object.values(AdminRole).reduce(
      (acc, role) => {
        acc[role] = admins.filter((a) => a.role === role).length;
        return acc;
      },
      {} as Record<string, number>,
    );
    return { total, active, revoked, superAdmins, roleBreakdown };
  }, [admins]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(admins.map((a) => a.role));
    return Array.from(roles);
  }, [admins]);

  const resetForm = () => {
    setNewName("");
    setNewEmail("");
    setNewRole(AdminRole.SECTION_ADMIN);
    setNewCollegeId("");
    setNewYearId("");
    setNewSectionId("");
    setNewSocietyId("");
    setEditingAdmin(null);
  };

  const openEditDialog = (admin: Admin) => {
    setEditingAdmin(admin);
    setNewName(admin.name || "");
    setNewEmail(admin.email || "");
    setNewRole(admin.role || AdminRole.SECTION_ADMIN);
    setNewCollegeId(admin.college_id?.toString() || "");
    setNewYearId(admin.year_id?.toString() || "");
    setNewSectionId(admin.section_id?.toString() || "");
    setNewSocietyId(admin.society_id?.toString() || "");
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!newName || !newEmail) {
      alert("Please fill in name and email");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      name: newName,
      email: newEmail,
      role: newRole,
      college_id: newCollegeId ? parseInt(newCollegeId) : null,
      year_id: newYearId ? parseInt(newYearId) : null,
      section_id: newSectionId ? parseInt(newSectionId) : null,
      society_id: newSocietyId ? parseInt(newSocietyId) : null,
    };

    if (editingAdmin) {
      // Update existing admin
      const { error: updateError } = await supabase
        .from("admins")
        .update(payload)
        .eq("id", editingAdmin.id);

      if (updateError) {
        alert("Error updating admin: " + updateError.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      // Create new admin via edge function (creates auth user + admin record)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        alert("Not authenticated");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        alert("Error creating admin: " + (result.error || "Unknown error"));
        setIsSubmitting(false);
        return;
      }

      setGeneratedCredentials({
        email: newEmail,
        password: result.tempPassword,
      });
      setShowCredentialsModal(true);
    }

    setShowCreateModal(false);
    fetchData();
    resetForm();
    setIsSubmitting(false);
  };

  const handleResetPassword = async () => {
    if (!resetAdminId) return;

    // Generate new temporary password
    const tempPass =
      Math.random().toString(36).slice(-8).toUpperCase() +
      "@" +
      Math.floor(Math.random() * 10);

    const { error } = await supabase
      .from("admins")
      .update({ first_login: true })
      .eq("id", resetAdminId);

    if (error) {
      alert("Error resetting password: " + error.message);
      return;
    }

    const admin = admins.find((a) => a.id === resetAdminId);
    setShowResetModal(false);
    setResetAdminId(null);
    setGeneratedCredentials({ email: admin?.email || "", password: tempPass });
    setShowCredentialsModal(true);
  };

  const openResetModal = (adminId: string) => {
    setResetAdminId(adminId);
    setShowResetModal(true);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this admin's access?"))
      return;
    const { error } = await supabase
      .from("admins")
      .update({ active: false })
      .eq("id", id);
    if (!error) fetchData();
  };

  const handleReactivate = async (id: string) => {
    const { error } = await supabase
      .from("admins")
      .update({ active: true })
      .eq("id", id);
    if (!error) fetchData();
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (admin.role === AdminRole.SUPER_ADMIN) {
      alert("Cannot delete a Super Admin.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to permanently delete admin "${admin.name}" (${admin.email})? This cannot be undone.`,
      )
    )
      return;

    const { error } = await supabase
      .from("admins")
      .delete()
      .eq("id", admin.id);

    if (error) {
      alert("Error deleting admin: " + error.message);
    } else {
      fetchData();
    }
  };

  const getScope = (admin: Admin) => {
    const parts: string[] = [];
    if (admin.society?.name) parts.push(admin.society.name);
    if (admin.college?.code) parts.push(admin.college.code);
    if (admin.year?.name) parts.push(admin.year.name);
    if (admin.section?.name) parts.push(`Sec ${admin.section.name}`);
    return parts.length > 0 ? parts.join(" • ") : "Faculty-Wide";
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Admin Allocation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Designate administrative access across colleges
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
        >
          <span className="mr-2">+</span> Allocate New Admin
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.total}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Total Admins
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.active}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.revoked}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Revoked
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.superAdmins}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Super Admins
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="active" className="relative">
            Active
            {stats.active > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                {stats.active}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="revoked" className="relative">
            Revoked
            {stats.revoked > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {stats.revoked}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Admins</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-6">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="max-w-sm bg-white border-slate-200"
          />
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[200px] bg-white border-slate-200">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {(searchQuery || filterRole !== "all" || filterCollege !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilterRole("all");
                setFilterCollege("all");
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-slate-500">
          Showing {filteredAdmins.length} of {admins.length} admins
          {(searchQuery || filterRole !== "all" || filterCollege !== "all") && (
            <span className="ml-1">(filtered)</span>
          )}
        </div>

        {/* Admins Table */}
        <TabsContent value={activeTab} className="mt-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Administrator</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-slate-500"
                      >
                        Loading admins...
                      </TableCell>
                    </TableRow>
                  ) : filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-slate-500"
                      >
                        {searchQuery ||
                        filterRole !== "all" ||
                        filterCollege !== "all"
                          ? "No admins match your filters"
                          : activeTab === "revoked"
                            ? "No revoked admins"
                            : "No admins found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdmins.map((admin) => (
                      <TableRow
                        key={admin.id}
                        className={`hover:bg-slate-50/50 ${!admin.active ? "opacity-60" : ""}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm border ${
                                admin.role === AdminRole.SUPER_ADMIN
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {admin.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {admin.name}
                                {admin.role === AdminRole.SUPER_ADMIN && (
                                  <span className="ml-2 text-amber-500 text-xs">
                                    ★
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {admin.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-normal ${
                              admin.role === AdminRole.SUPER_ADMIN
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {admin.role?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {getScope(admin)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`font-normal ${
                              admin.active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-600 border-red-200"
                            } border`}
                          >
                            {admin.active ? "Active" : "Revoked"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(admin)}
                              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openResetModal(admin.id)}
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              Reset
                            </Button>
                            {admin.active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(admin.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(admin.id)}
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                Reactivate
                              </Button>
                            )}
                            {isSuperAdmin && admin.role !== AdminRole.SUPER_ADMIN && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAdmin(admin)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            )}
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

      {/* Create/Edit Admin Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingAdmin ? "Edit Admin" : "Allocate Admin Access"}
            </DialogTitle>
            <p className="text-sm text-slate-500">
              {editingAdmin
                ? "Update admin details and scope"
                : "Designate boundaries for institutional admins"}
            </p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Full Name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Rahul Verma"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Email / Login ID
              </label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="rahul@faculty.law"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Role
              </label>
              <Select
                value={newRole}
                onValueChange={(v) => {
                  setNewRole(v as AdminRole);
                  setNewCollegeId("");
                  setNewYearId("");
                  setNewSectionId("");
                  setNewSocietyId("");
                }}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AdminRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showSociety && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Society (Select College First)
                </label>
                <Select
                  value={newSocietyId}
                  onValueChange={setNewSocietyId}
                  disabled={!newCollegeId}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select society" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSocieties.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showCollege && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  College
                </label>
                <div className="flex gap-2">
                  {colleges.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setNewCollegeId(c.id.toString());
                        setNewYearId("");
                        setNewSectionId("");
                        setNewSocietyId("");
                      }}
                      className={`flex-1 py-2.5 text-xs font-semibold border rounded-lg transition-all ${
                        newCollegeId === c.id.toString()
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

            {showYear && newCollegeId && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Year
                </label>
                <Select
                  value={newYearId}
                  onValueChange={(v) => {
                    setNewYearId(v);
                    setNewSectionId("");
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

            {showSection && newYearId && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Section
                </label>
                <Select value={newSectionId} onValueChange={setNewSectionId}>
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

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newName || !newEmail}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting
                  ? editingAdmin
                    ? "Updating..."
                    : "Creating..."
                  : editingAdmin
                    ? "Update Admin"
                    : "Allocate Authority"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Credentials Modal */}
      <Dialog
        open={showCredentialsModal}
        onOpenChange={setShowCredentialsModal}
      >
        <DialogContent className="sm:max-w-[400px] text-center">
          <div className="py-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl border border-emerald-100">
              🔐
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              Admin Created
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Share these credentials with the new admin
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 text-left">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Login Email
                </p>
                <p className="font-mono text-sm font-semibold text-slate-900 select-all">
                  {generatedCredentials?.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Temporary Password
                </p>
                <p className="font-mono text-sm font-semibold text-red-600 select-all">
                  {generatedCredentials?.password}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Admin will be prompted to change password on first login
            </p>

            <Button
              onClick={() => {
                setShowCredentialsModal(false);
                setGeneratedCredentials(null);
              }}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Reset Admin Password</DialogTitle>
            <p className="text-sm text-slate-500">
              Generate a new temporary password for this admin
            </p>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              This will generate a new temporary password. The admin will need
              to change it on their next login.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetModal(false);
                  setResetAdminId(null);
                }}
                className="flex-1 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
