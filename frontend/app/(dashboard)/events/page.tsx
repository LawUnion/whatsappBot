"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadFile } from "@/lib/storage";
import { useAdminScope } from "@/hooks/useAdminScope";

interface EventType {
  id: number;
  name: string;
  icon: string;
}

interface College {
  id: number;
  name: string;
  code?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type_id: number;
  target_colleges?: number[];
  file_url?: string;
  event_type?: { name: string; icon: string };
  college?: { name: string };
  admin?: { name: string };
}

const PAGE_SIZE = 12;

export default function EventsPage() {
  const supabase = createClient();
  const { isSuperAdmin } = useAdminScope();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Manage Event Types dialog
  const [isTypesDialogOpen, setIsTypesDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeIcon, setNewTypeIcon] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeIcon, setEditTypeIcon] = useState("");
  const [isTypeSubmitting, setIsTypeSubmitting] = useState(false);

  // Filters and Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCollege, setFilterCollege] = useState("all");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTargetColleges, setNewTargetColleges] = useState<number[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [newResourceType, setNewResourceType] = useState<"none" | "file" | "link">("none");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const [eventsRes, typesRes, collegesRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, event_type:event_types(name, icon), college:colleges(name), admin:admins!created_by(name)")
        .order("event_date", { ascending: true }),
      supabase.from("event_types").select("*"),
      supabase.from("colleges").select("*"),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (typesRes.data) setEventTypes(typesRes.data);
    if (collegesRes.data) setColleges(collegesRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const toggleCollege = (id: number) => {
    setNewTargetColleges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  // Filtered and paginated events
  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = [...events];

    // Filter by tab (upcoming/past)
    if (activeTab === "upcoming") {
      filtered = filtered.filter((e) => new Date(e.event_date) >= today);
    } else if (activeTab === "past") {
      filtered = filtered.filter((e) => new Date(e.event_date) < today);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query),
      );
    }

    // Filter by event type
    if (filterType !== "all") {
      filtered = filtered.filter(
        (e) => e.event_type_id?.toString() === filterType,
      );
    }

    // Filter by college
    if (filterCollege !== "all") {
      filtered = filtered.filter(
        (e) => !e.target_colleges || e.target_colleges.includes(parseInt(filterCollege)),
      );
    }

    return filtered;
  }, [events, searchQuery, filterType, filterCollege, activeTab]);

  // Paginated events for display
  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, displayCount);
  }, [filteredEvents, displayCount]);

  const hasMore = displayCount < filteredEvents.length;

  const loadMore = () => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  };

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, filterType, filterCollege, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events.filter(
      (e) => new Date(e.event_date) >= today,
    ).length;
    const past = events.filter((e) => new Date(e.event_date) < today).length;
    return { total: events.length, upcoming, past };
  }, [events]);

  const resetForm = () => {
    setNewTitle("");
    setNewTypeId("");
    setNewDate("");
    setNewDescription("");
    setNewTargetColleges(colleges.map((c) => c.id));
    setNewResourceType("none");
    setNewResourceUrl("");
    setSelectedFile(null);
    setEditingEvent(null);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setNewTitle(event.title || "");
    setNewTypeId(event.event_type_id?.toString() || "");
    setNewDate(event.event_date || "");
    setNewDescription(event.description || "");
    setNewTargetColleges(event.target_colleges || []);
    if (event.file_url) {
      setNewResourceType("link");
      setNewResourceUrl(event.file_url);
    } else {
      setNewResourceType("none");
      setNewResourceUrl("");
    }
    setIsDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!newTitle || !newTypeId || !newDate) return;
    setIsSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let fileUrl: string | null = null;

    // Handle file upload
    if (newResourceType === "file" && selectedFile) {
      setUploadingFile(true);
      const result = await uploadFile(selectedFile, "events");
      setUploadingFile(false);
      if (!result.success) {
        alert(result.error || "Failed to upload file");
        setIsSubmitting(false);
        return;
      }
      fileUrl = result.publicUrl || null;
    } else if (newResourceType === "link" && newResourceUrl) {
      fileUrl = newResourceUrl;
    }

    const payload: any = {
      title: newTitle,
      description: newDescription,
      event_date: newDate,
      event_type_id: parseInt(newTypeId),
      target_colleges: newTargetColleges.length > 0 && newTargetColleges.length < colleges.length ? newTargetColleges : null,
      file_url: fileUrl,
    };

    let error;
    if (editingEvent) {
      const { error: updateError } = await supabase
        .from("events")
        .update(payload)
        .eq("id", editingEvent.id);
      error = updateError;
    } else {
      payload.created_by = userData.user.id;
      payload.approval_status = isSuperAdmin ? "approved" : "pending";
      const { error: insertError } = await supabase
        .from("events")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      alert(
        `Error ${editingEvent ? "updating" : "creating"} event: ` +
          error.message,
      );
    } else {
      fetchInitialData();
      setIsDialogOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (!error) {
      fetchInitialData();
    } else {
      alert("Error deleting event");
    }
  };

  // Event Type CRUD handlers
  const handleCreateType = async () => {
    if (!newTypeName.trim() || !newTypeIcon.trim()) return;
    setIsTypeSubmitting(true);
    const { error } = await supabase
      .from("event_types")
      .insert({ name: newTypeName.trim(), icon: newTypeIcon.trim() });
    if (error) {
      alert("Error creating event type: " + error.message);
    } else {
      setNewTypeName("");
      setNewTypeIcon("");
      fetchInitialData();
    }
    setIsTypeSubmitting(false);
  };

  const handleUpdateType = async (id: number) => {
    if (!editTypeName.trim() || !editTypeIcon.trim()) return;
    setIsTypeSubmitting(true);
    const { error } = await supabase
      .from("event_types")
      .update({ name: editTypeName.trim(), icon: editTypeIcon.trim() })
      .eq("id", id);
    if (error) {
      alert("Error updating event type: " + error.message);
    } else {
      setEditingTypeId(null);
      setEditTypeName("");
      setEditTypeIcon("");
      fetchInitialData();
    }
    setIsTypeSubmitting(false);
  };

  const handleDeleteType = async (id: number) => {
    // Check if any events reference this type
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type_id", id);
    if (count && count > 0) {
      alert(
        `Cannot delete this event type — it is used by ${count} event${count > 1 ? "s" : ""}. Remove or reassign those events first.`
      );
      return;
    }
    if (!confirm("Are you sure you want to delete this event type?")) return;
    const { error } = await supabase.from("event_types").delete().eq("id", id);
    if (error) {
      alert("Error deleting event type: " + error.message);
    } else {
      fetchInitialData();
    }
  };

  const startEditType = (type: EventType) => {
    setEditingTypeId(type.id);
    setEditTypeName(type.name);
    setEditTypeIcon(type.icon);
  };

  const cancelEditType = () => {
    setEditingTypeId(null);
    setEditTypeName("");
    setEditTypeIcon("");
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Events
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage faculty events and programs
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
              <span className="mr-2">+</span> New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "Create New Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Event Title
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Event name"
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Event Type
                </label>
                <Select value={newTypeId} onValueChange={setNewTypeId}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.icon} {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Target Colleges
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colleges.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollege(c.id)}
                      className={`px-3 py-2 flex-1 min-w-[80px] text-xs font-semibold border rounded-lg transition-all ${
                        newTargetColleges.includes(c.id)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {c.code || c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Date
                </label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Attachment
                </label>
                <Select
                  value={newResourceType}
                  onValueChange={(v) => setNewResourceType(v as "none" | "file" | "link")}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="file">Upload File</SelectItem>
                    <SelectItem value="link">Link / URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newResourceType === "file" && (
                <div className="space-y-2 col-span-2">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {selectedFile && (
                    <p className="text-xs text-slate-500">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}
              {newResourceType === "link" && (
                <div className="space-y-2 col-span-2">
                  <Input
                    value={newResourceUrl}
                    onChange={(e) => setNewResourceUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
              )}
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Event details..."
                  className="bg-slate-50 border-slate-200 min-h-[100px]"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full col-span-2 bg-slate-900 hover:bg-slate-800"
              >
                {isSubmitting
                  ? editingEvent
                    ? "Updating..."
                    : "Creating..."
                  : editingEvent
                    ? "Update Event"
                    : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.total}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Total Events
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.upcoming}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Upcoming
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.past}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Past Events
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="upcoming" className="relative">
            Upcoming
            {stats.upcoming > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                {stats.upcoming}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
          <TabsTrigger value="all">All Events</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events..."
          className="max-w-sm bg-white border-slate-200"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-white border-slate-200">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.icon} {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <Dialog
            open={isTypesDialogOpen}
            onOpenChange={(open) => {
              setIsTypesDialogOpen(open);
              if (!open) {
                cancelEditType();
                setNewTypeName("");
                setNewTypeIcon("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Manage Types
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manage Event Types</DialogTitle>
              </DialogHeader>
              {/* Create new type form */}
              <div className="flex items-end gap-2 mt-2">
                <div className="space-y-1 w-16">
                  <label className="text-xs font-medium text-slate-500">Icon</label>
                  <Input
                    value={newTypeIcon}
                    onChange={(e) => setNewTypeIcon(e.target.value)}
                    placeholder="📋"
                    className="bg-slate-50 border-slate-200 text-center"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-slate-500">Name</label>
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="New event type name"
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
                <Button
                  onClick={handleCreateType}
                  disabled={isTypeSubmitting || !newTypeName.trim() || !newTypeIcon.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                  size="sm"
                >
                  Add
                </Button>
              </div>
              {/* Event types list */}
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 mt-2 max-h-[350px] overflow-y-auto">
                {eventTypes.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    No event types yet
                  </div>
                ) : (
                  eventTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {editingTypeId === type.id ? (
                        <>
                          <Input
                            value={editTypeIcon}
                            onChange={(e) => setEditTypeIcon(e.target.value)}
                            className="w-14 bg-slate-50 border-slate-200 text-center"
                          />
                          <Input
                            value={editTypeName}
                            onChange={(e) => setEditTypeName(e.target.value)}
                            className="flex-1 bg-slate-50 border-slate-200"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-200 text-slate-600"
                            disabled={isTypeSubmitting || !editTypeName.trim() || !editTypeIcon.trim()}
                            onClick={() => handleUpdateType(type.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400"
                            onClick={cancelEditType}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xl w-8 text-center shrink-0">
                            {type.icon}
                          </span>
                          <span className="flex-1 text-sm text-slate-700 font-medium">
                            {type.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-slate-600"
                            onClick={() => startEditType(type)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteType(type.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
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
        {(searchQuery || filterType !== "all" || filterCollege !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
              setFilterCollege("all");
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-500">
        Showing {displayedEvents.length} of {filteredEvents.length} events
        {(searchQuery || filterType !== "all" || filterCollege !== "all") && (
          <span className="ml-1">(filtered)</span>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500">
            Loading events...
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500">
            {searchQuery || filterType !== "all" || filterCollege !== "all"
              ? "No events match your filters"
              : activeTab === "upcoming"
                ? "No upcoming events"
                : activeTab === "past"
                  ? "No past events"
                  : "No events found. Create one!"}
          </div>
        ) : (
          displayedEvents.map((event) => {
            const isPast = new Date(event.event_date) < new Date();
            return (
              <Card
                key={event.id}
                className={`border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group bg-white ${isPast ? "opacity-70" : ""}`}
              >
                <div className="h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative">
                  <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform">
                    {event.event_type?.icon || "📅"}
                  </span>
                  {isPast && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-slate-200 text-slate-600 border-0 text-xs">
                        Past
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <Badge
                    variant="outline"
                    className="mb-3 bg-white text-slate-600 border-slate-200 font-normal"
                  >
                    {event.event_type?.name}
                  </Badge>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2 truncate">
                    {event.title}
                  </h3>
                  <div className="space-y-1 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🏫</span>
                      <span>{event.college?.name || "All Colleges"}</span>
                    </div>
                    {event.admin?.name && (
                      <div className="flex items-center gap-2">
                        <span>👤</span>
                        <span>By: {event.admin.name}</span>
                      </div>
                    )}
                    {event.file_url && (
                      <a
                        href={event.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <span>📎</span>
                        <span>View Attachment</span>
                      </a>
                    )}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                      onClick={() => openEditDialog(event)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(event.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Load More ({filteredEvents.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
