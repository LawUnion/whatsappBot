import { Student } from "../types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ghost, Check, X, Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";

interface StudentTableProps {
  students: Student[];
  loading: boolean;
  activeTab: string;
  processing: boolean;
  onApprove: (student: Student) => void;
  onReject: (student: Student) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export function StudentTable({
  students,
  loading,
  activeTab,
  processing,
  onApprove,
  onReject,
  onToggleStatus,
  onEdit,
  onDelete,
}: StudentTableProps) {
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
    <div className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
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
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-16 inline-block" /></TableCell>
              </TableRow>
            ))
          ) : students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <Ghost className="w-6 h-6" />
                  </div>
                  <p>{activeTab === "pending" ? "No pending approvals" : "No students found"}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 bg-slate-100 border border-slate-200">
                      <AvatarFallback className="text-slate-600 text-xs font-medium">
                        {student.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-900">{student.name || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-600">{student.form_number || "-"}</TableCell>
                <TableCell className="font-mono text-xs text-slate-600">{student.roll_number || "-"}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">
                  {student.whatsapp_id ? (
                    <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">WA: {student.whatsapp_name || student.whatsapp_id}</span>
                  ) : student.telegram_username ? (
                    <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">TG: @{student.telegram_username}</span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {student.college?.name ? (
                    <Badge variant="outline" className="font-normal text-slate-600 bg-white border-slate-200">{student.college.name}</Badge>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-slate-600 text-sm">{student.year?.name || "-"}</TableCell>
                <TableCell className="text-slate-600 text-sm">{student.section?.name || "-"}</TableCell>
                <TableCell>
                  <Badge className={`font-medium ${getStatusBadgeStyle(student.status)} border`}>{student.status}</Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-xs">{new Date(student.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {student.status === "Pending" ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => onApprove(student)} disabled={processing} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5"><Check className="w-4 h-4" /> Approve</Button>
                        <Button variant="ghost" size="sm" onClick={() => onReject(student)} disabled={processing} className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"><X className="w-4 h-4" /> Reject</Button>
                      </>
                    ) : student.status === "Active" || student.status === "Blocked" ? (
                      <Button variant="ghost" size="sm" onClick={() => onToggleStatus(student.id, student.status)} className={`gap-1.5 ${student.status === "Active" ? "text-slate-400 hover:text-red-600" : "text-slate-400 hover:text-emerald-600"}`}>
                        {student.status === "Active" ? <><Ban className="w-4 h-4" /> Block</> : <><CheckCircle2 className="w-4 h-4" /> Unblock</>}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">{student.rejection_reason ? `Reason: ${student.rejection_reason.substring(0, 20)}...` : "Rejected"}</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onEdit(student)} disabled={processing} className="text-slate-400 hover:text-slate-600"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(student)} disabled={processing} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
