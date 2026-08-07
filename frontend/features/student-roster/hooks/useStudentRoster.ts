import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RosterEntry, College, Year, Section } from "../types";

export function useStudentRoster() {
  const supabase = createClient();

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
        "*, college:colleges(name), year:years(name), section:sections(name), students!claimed_by(whatsapp_id, telegram_username)",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this roster entry?")) return;

    const { error } = await supabase
      .from("student_roster")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error deleting entry: " + error.message);
    } else {
      toast.success("Roster entry deleted");
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
      toast.error("Error updating student record: " + studentError.message);
      setLoading(false);
      return;
    }

    // Then update the roster entry
    const { error: rosterError } = await supabase
      .from("student_roster")
      .update({ is_claimed: false, claimed_by: null })
      .eq("id", entry.id);

    if (rosterError) {
      toast.error("Error unclaiming roster entry: " + rosterError.message);
    } else {
      toast.success("Roster entry unclaimed successfully");
      fetchRoster();
      fetchMetadata();
    }
    
    setLoading(false);
  };

  return {
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
  };
}
