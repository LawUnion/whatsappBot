import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "../types";

interface StudentModalsProps {
  showRejectModal: boolean;
  setShowRejectModal: (show: boolean) => void;
  rejectingStudent: Student | null;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  rejectStudent: () => void;
  
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  editingStudent: Student | null;
  editFormData: any;
  setEditFormData: (data: any) => void;
  handleUpdateStudent: () => void;
  
  processing: boolean;
  colleges: any[];
  filteredYears: any[];
  filteredSections: any[];
}

export function StudentModals({
  showRejectModal,
  setShowRejectModal,
  rejectingStudent,
  rejectReason,
  setRejectReason,
  rejectStudent,
  
  showEditModal,
  setShowEditModal,
  editingStudent,
  editFormData,
  setEditFormData,
  handleUpdateStudent,
  
  processing,
  colleges,
  filteredYears,
  filteredSections,
}: StudentModalsProps) {
  return (
    <>
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to reject the registration for{" "}
              <strong>{rejectingStudent?.name}</strong> (
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
    </>
  );
}
