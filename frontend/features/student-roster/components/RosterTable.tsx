import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RosterEntry } from "../types";

interface RosterTableProps {
  roster: RosterEntry[];
  loading: boolean;
  totalCount: number;
  handleUnclaim: (entry: RosterEntry) => void;
  openEditModal: (entry: RosterEntry) => void;
  handleDelete: (id: string) => void;
}

export function RosterTable({
  roster,
  loading,
  totalCount,
  handleUnclaim,
  openEditModal,
  handleDelete,
}: RosterTableProps) {
  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead>Form Number</TableHead>
          <TableHead>Roll Number</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>College</TableHead>
          <TableHead>Year</TableHead>
          <TableHead>Section</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 10 }).map((_, idx) => (
            <TableRow key={idx}>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : roster.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={10}
              className="text-center py-8 text-slate-500"
            >
              {totalCount === 0
                ? "No students in roster. Add students or import a CSV file."
                : "No matching entries found"}
            </TableCell>
          </TableRow>
        ) : (
          roster.map((entry) => (
            <TableRow key={entry.id} className="hover:bg-slate-50/50">
              <TableCell className="font-mono text-sm font-medium text-slate-900">
                {entry.form_number || "-"}
              </TableCell>
              <TableCell className="font-mono text-sm font-medium text-slate-900">
                {entry.roll_number}
              </TableCell>
              <TableCell className="font-medium text-slate-900">
                {entry.name}
              </TableCell>
              <TableCell>
                {entry.college?.name ? (
                  <Badge
                    variant="outline"
                    className="font-normal text-slate-600 bg-white border-slate-200"
                  >
                    {entry.college.name}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-slate-600 text-sm">
                {entry.year?.name || "-"}
              </TableCell>
              <TableCell className="text-slate-600 text-sm">
                {entry.section_name || entry.section?.name || "-"}
              </TableCell>
              <TableCell className="text-slate-500 text-sm">
                {entry.email || "-"}
              </TableCell>
              <TableCell className="text-slate-500 text-sm">
                {entry.phone ? entry.phone : (entry.is_claimed && entry.students?.whatsapp_id) ? <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-xs">{entry.students.whatsapp_id} (WA)</span> : "-"}
              </TableCell>
              <TableCell>
                <Badge
                  className={`font-normal ${
                    entry.is_claimed
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  } border`}
                >
                  {entry.is_claimed ? "Claimed" : "Available"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {entry.is_claimed ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnclaim(entry)}
                    className="text-slate-400 hover:text-amber-600"
                    title="Unlink claimed record"
                  >
                    🔗 Unlink
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(entry)}
                      className="text-slate-400 hover:text-slate-600"
                      title="Edit"
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                      className="text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      🗑️
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
