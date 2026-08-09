import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { RosterEntry, College, Year, Section } from "../types";

interface RosterModalsProps {
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  editingEntry: RosterEntry | null;
  formData: any;
  setFormData: (data: any) => void;
  handleSave: () => void;
  saving: boolean;
  colleges: College[];
  years: Year[];
  semesters: any[];
  sections: Section[];
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  importData: any[];
  setImportData: (data: any[]) => void;
  handleImport: () => void;
  importing: boolean;
  importCollegeId: string;
  setImportCollegeId: (id: string) => void;
  importYearId: string;
  setImportYearId: (id: string) => void;
  importSemesterId: string;
  setImportSemesterId: (id: string) => void;
  importSectionId: string;
  setImportSectionId: (id: string) => void;
  existingImportKeys?: Set<string>;
  importConflictAction?: "overwrite" | "skip";
  setImportConflictAction?: (action: "overwrite" | "skip") => void;
}

export function RosterModals({
  showAddModal,
  setShowAddModal,
  editingEntry,
  formData,
  setFormData,
  handleSave,
  saving,
  colleges,
  years,
  semesters,
  sections,
  showImportModal,
  setShowImportModal,
  importData,
  setImportData,
  handleImport,
  importing,
  importCollegeId,
  setImportCollegeId,
  importYearId,
  setImportYearId,
  importSemesterId,
  setImportSemesterId,
  importSectionId,
  setImportSectionId,
  existingImportKeys = new Set(),
  importConflictAction,
  setImportConflictAction,
}: RosterModalsProps) {
  const filteredYears = years.filter(
    (y) => y.college_id.toString() === formData.college_id,
  );
  
  const filteredImportYears = years.filter(
    (y) => y.college_id.toString() === importCollegeId,
  );

  const [previewMode, setPreviewMode] = useState<"all" | "duplicates">("all");
  const duplicateData = importData.filter(row => existingImportKeys.has(row.form_number) || existingImportKeys.has(row.roll_number));
  const dataToShow = previewMode === "duplicates" ? duplicateData : importData;

  return (
    <>
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
                <Label htmlFor="roll_number">Roll Number</Label>
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

      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="text-sm font-medium text-slate-800 mb-3">Optional: Assign all imported students to:</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>College</Label>
                  <Select
                    value={importCollegeId}
                    onValueChange={(v) => {
                      setImportCollegeId(v);
                      setImportYearId("");
                      setImportSemesterId("");
                      setImportSectionId("");
                    }}
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
                    value={importYearId}
                    onValueChange={(v) => {
                      setImportYearId(v);
                      setImportSemesterId("");
                      setImportSectionId("");
                    }}
                    disabled={!importCollegeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredImportYears.map((y) => (
                        <SelectItem key={y.id} value={y.id.toString()}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={importSemesterId}
                    onValueChange={setImportSemesterId}
                    disabled={!importYearId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters
                        .filter((s) => s.year_id.toString() === importYearId)
                        .map((sem) => (
                          <SelectItem key={sem.id} value={sem.id.toString()}>
                            {sem.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 mb-2">
              <p className="text-sm text-slate-600">
                {previewMode === "all" ? `Found ${importData.length} entries to import.` : `Found ${duplicateData.length} existing entries.`} Review the data below:
              </p>
              {existingImportKeys.size > 0 && (
                <div className="flex gap-2">
                  <Button 
                    variant={previewMode === "all" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setPreviewMode("all")}
                    className="h-8 text-xs"
                  >
                    All Entries ({importData.length})
                  </Button>
                  <Button 
                    variant={previewMode === "duplicates" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setPreviewMode("duplicates")}
                    className={`h-8 text-xs ${previewMode === "duplicates" ? "bg-amber-500 hover:bg-amber-600" : "text-amber-600 border-amber-200 hover:bg-amber-50"}`}
                  >
                    Duplicates ({existingImportKeys.size})
                  </Button>
                </div>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataToShow.slice(0, 10).map((row, idx) => {
                    const isExisting = existingImportKeys.has(row.form_number) || existingImportKeys.has(row.roll_number);
                    return (
                    <TableRow key={idx} className={isExisting ? "bg-amber-50/50" : ""}>
                      <TableCell className="font-mono text-xs">
                        {row.form_number || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.roll_number || "-"}
                        {isExisting && (
                          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                            Exists
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{row.name}</TableCell>
                      <TableCell className="text-sm font-semibold text-center">
                        {row.section_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {row.email || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {row.phone || "-"}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {dataToShow.length > 10 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-500 text-sm"
                      >
                        ...and {dataToShow.length - 10} more entries
                      </TableCell>
                    </TableRow>
                  )}
                  {dataToShow.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 text-sm py-4">
                        No entries found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {existingImportKeys.size > 0 && setImportConflictAction && (
              <div className="bg-amber-50 p-4 rounded-md mt-4 border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-3">
                  Found {existingImportKeys.size} records that already exist in the database.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="conflictAction"
                      value="overwrite"
                      checked={importConflictAction === "overwrite"}
                      onChange={() => setImportConflictAction("overwrite")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Overwrite existing records with new data</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="conflictAction"
                      value="skip"
                      checked={importConflictAction === "skip"}
                      onChange={() => setImportConflictAction("skip")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Skip existing records (only add new ones)</span>
                  </label>
                </div>
              </div>
            )}
            
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
    </>
  );
}
