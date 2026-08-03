"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminRole, type Admin } from "@/lib/types";

interface AdminScope {
  admin: Admin | null;
  loading: boolean;
  isSuperAdmin: boolean;
  // Scope constraints based on admin role
  collegeId: number | null;
  yearId: number | null;
  sectionId: number | null;
  societyId: number | null;
  // Helper functions
  canAccessCollege: (collegeId: number) => boolean;
  canAccessYear: (yearId: number, collegeId: number) => boolean;
  canAccessSection: (sectionId: number) => boolean;
  // Filter functions for dropdowns
  filterColleges: <T extends { id: number }>(colleges: T[]) => T[];
  filterYears: <T extends { id: number; college_id: number }>(years: T[]) => T[];
  filterSections: <T extends { id: number; semester?: { year_id?: number; year?: { college_id?: number } } }>(sections: T[]) => T[];
}

export function useAdminScope(): AdminScope {
  const supabase = createClient();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("admins")
        .select(`
          *,
          college:colleges(*),
          year:years(*),
          section:sections(*, semester:semesters(year_id, year:years(college_id)))
        `)
        .eq("id", user.id)
        .single();

      if (data) {
        setAdmin(data as Admin);
      }
      setLoading(false);
    };

    fetchAdmin();
  }, [supabase]);

  const isSuperAdmin = admin?.role === AdminRole.SUPER_ADMIN;

  // Get scope constraints
  const collegeId = admin?.college_id ?? null;
  const yearId = admin?.year_id ?? null;
  const sectionId = admin?.section_id ?? null;
  const societyId = admin?.society_id ?? null;

  // Check if admin can access a specific college
  const canAccessCollege = useCallback((targetCollegeId: number): boolean => {
    if (isSuperAdmin) return true;
    if (!collegeId) return true; // No college restriction
    return collegeId === targetCollegeId;
  }, [isSuperAdmin, collegeId]);

  // Check if admin can access a specific year
  const canAccessYear = useCallback((targetYearId: number, targetCollegeId: number): boolean => {
    if (isSuperAdmin) return true;
    if (collegeId && collegeId !== targetCollegeId) return false;
    if (!yearId) return true; // No year restriction
    return yearId === targetYearId;
  }, [isSuperAdmin, collegeId, yearId]);

  // Check if admin can access a specific section
  const canAccessSection = useCallback((targetSectionId: number): boolean => {
    if (isSuperAdmin) return true;
    if (!sectionId) return true; // No section restriction
    return sectionId === targetSectionId;
  }, [isSuperAdmin, sectionId]);

  // Filter colleges based on admin scope
  const filterColleges = useCallback(<T extends { id: number }>(colleges: T[]): T[] => {
    if (isSuperAdmin || !collegeId) return colleges;
    return colleges.filter(c => c.id === collegeId);
  }, [isSuperAdmin, collegeId]);

  // Filter years based on admin scope
  const filterYears = useCallback(<T extends { id: number; college_id: number }>(years: T[]): T[] => {
    if (isSuperAdmin) return years;

    let filtered = years;

    // Filter by college if restricted
    if (collegeId) {
      filtered = filtered.filter(y => y.college_id === collegeId);
    }

    // Filter by specific year if restricted
    if (yearId) {
      filtered = filtered.filter(y => y.id === yearId);
    }

    return filtered;
  }, [isSuperAdmin, collegeId, yearId]);

  // Filter sections based on admin scope
  const filterSections = useCallback(<T extends { id: number; semester?: { year_id?: number; year?: { college_id?: number } } }>(sections: T[]): T[] => {
    if (isSuperAdmin) return sections;

    let filtered = sections;

    // Filter by college if restricted
    if (collegeId) {
      filtered = filtered.filter(s => s.semester?.year?.college_id === collegeId);
    }

    // Filter by year if restricted
    if (yearId) {
      filtered = filtered.filter(s => s.semester?.year_id === yearId);
    }

    // Filter by specific section if restricted
    if (sectionId) {
      filtered = filtered.filter(s => s.id === sectionId);
    }

    return filtered;
  }, [isSuperAdmin, collegeId, yearId, sectionId]);

  return {
    admin,
    loading,
    isSuperAdmin,
    collegeId,
    yearId,
    sectionId,
    societyId,
    canAccessCollege,
    canAccessYear,
    canAccessSection,
    filterColleges,
    filterYears,
    filterSections,
  };
}
