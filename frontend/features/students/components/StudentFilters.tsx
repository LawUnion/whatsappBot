import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCollege: string;
  setFilterCollege: (val: string) => void;
  activeTab: string;
  setActiveTab: (val: string) => void;
  pendingCount: number;
  scopedColleges: any[];
}

export function StudentFilters({
  searchQuery,
  setSearchQuery,
  filterCollege,
  setFilterCollege,
  activeTab,
  setActiveTab,
  pendingCount,
  scopedColleges,
}: StudentFiltersProps) {
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pending" className="relative rounded-lg px-4">
            Pending Approval
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg px-4">Active Students</TabsTrigger>
          <TabsTrigger value="blocked" className="rounded-lg px-4">Blocked/Rejected</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg px-4">All Students</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, Telegram, WhatsApp, or form/roll number..."
          className="max-w-md bg-white border-slate-200 shadow-sm rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300"
        />
        {scopedColleges.length > 1 && (
          <Select value={filterCollege} onValueChange={setFilterCollege}>
            <SelectTrigger className="w-[200px] bg-white border-slate-200 shadow-sm rounded-xl">
              <SelectValue placeholder="All Colleges" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Colleges</SelectItem>
              {scopedColleges.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
