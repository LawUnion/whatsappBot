import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { College, Year } from "../types";

interface RosterFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCollege: string;
  setFilterCollege: (val: string) => void;
  filterYear: string;
  setFilterYear: (val: string) => void;
  filterSection: string;
  setFilterSection: (val: string) => void;
  filterClaimed: string;
  setFilterClaimed: (val: string) => void;
  colleges: College[];
  years: Year[];
}

export function RosterFilters({
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
  colleges,
  years,
}: RosterFiltersProps) {
  return (
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
  );
}
