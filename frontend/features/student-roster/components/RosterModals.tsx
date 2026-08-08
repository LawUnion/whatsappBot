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
  importSectionId: string;
  setImportSectionId: (id: string) => void;
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
  importSectionId,
  setImportSectionId,
}: RosterModalsProps) {
  const filteredYears = years.filter(
    (y) => y.college_id.toString() === formData.college_id,
  );
  
  const filteredImportYears = years.filter(
    (y) => y.college_id.toString() === importCollegeId,
  );

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
                  <Label>Section</Label>
                  <Select
                    value={importSectionId}
                    onValueChange={(v) => setImportSectionId(v)}
                    disabled={!importYearId}
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
            </div>
            
            <p className="text-sm text-slate-600">
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
                        colSpan={4}
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
    </>
  );
}
