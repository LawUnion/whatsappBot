import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdminScope } from "@/hooks/useAdminScope";
import { useLoader } from "@/contexts/LoaderContext";
import { Student } from "../types";

export function useStudents() {
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
  const [years, setYears] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [_filterStatus, _setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");

  const [processing, setProcessing] = useState(false);
  const { showLoader, hideLoader } = useLoader();

  // Set initial filter based on admin scope
  useEffect(() => {
    if (!adminLoading && admin && adminCollegeId) {
      setFilterCollege(adminCollegeId.toString());
    }
  }, [adminLoading, admin, adminCollegeId]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);

    let studentsQuery = supabase
      .from("students")
      .select("*, college:colleges(name), year:years(name), section:sections(name)")
      .order("created_at", { ascending: false });

    if (adminSectionId) {
      studentsQuery = studentsQuery.eq("section_id", adminSectionId);
    } else if (adminYearId) {
      studentsQuery = studentsQuery.eq("year_id", adminYearId);
    } else if (adminCollegeId) {
      studentsQuery = studentsQuery.eq("college_id", adminCollegeId);
    }

    const [studentsRes, collegesRes, yearsRes, semestersRes, sectionsRes] = await Promise.all([
      studentsQuery,
      supabase.from("colleges").select("*"),
      supabase.from("years").select("*"),
      supabase.from("semesters").select("*"),
      supabase.from("sections").select("*"),
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (collegesRes.data) setColleges(collegesRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    if (semestersRes.data) setSemesters(semestersRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
    setLoading(false);
  }, [adminCollegeId, adminSectionId, adminYearId, supabase]);

  useEffect(() => {
    if (!adminLoading) {
      fetchInitialData();
    }

    const channel = supabase
      .channel("students-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminLoading, fetchInitialData, supabase]);

  useEffect(() => {
    let filtered = [...students];

    if (activeTab === "pending") {
      filtered = filtered.filter((s) => s.status === "Pending");
    } else if (activeTab === "active") {
      filtered = filtered.filter((s) => s.status === "Active");
    } else if (activeTab === "blocked") {
      filtered = filtered.filter((s) => s.status === "Blocked" || s.status === "Rejected");
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.telegram_username?.toLowerCase().includes(q) ||
          s.whatsapp_name?.toLowerCase().includes(q) ||
          s.form_number?.toLowerCase().includes(q) ||
          s.roll_number?.toLowerCase().includes(q)
      );
    }

    if (filterCollege !== "all") {
      filtered = filtered.filter((s) => s.college_id?.toString() === filterCollege);
    }

    if (_filterStatus !== "all") {
      filtered = filtered.filter((s) => s.status === _filterStatus);
    }

    setFilteredStudents(filtered);
  }, [searchQuery, filterCollege, _filterStatus, students, activeTab]);

  const scopedColleges = useMemo(() => {
    if (isSuperAdmin || !adminCollegeId) return colleges;
    return colleges.filter((c) => c.id === adminCollegeId);
  }, [colleges, isSuperAdmin, adminCollegeId]);

  return {
    students,
    filteredStudents,
    loading,
    colleges,
    scopedColleges,
    years,
    semesters,
    sections,
    searchQuery,
    setSearchQuery,
    filterCollege,
    setFilterCollege,
    activeTab,
    setActiveTab,
    _filterStatus,
    _setFilterStatus,
    processing,
    setProcessing,
    fetchInitialData,
    showLoader,
    hideLoader,
    supabase
  };
}
