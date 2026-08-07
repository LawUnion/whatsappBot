"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ActionType, type BotButton } from "@/lib/types";

const MODULE_OPTIONS = [
  { value: "schedule", label: "Class Schedule View" },
  { value: "accommodation", label: "Accommodation Help" },
  { value: "notices", label: "Official Notice Board" },
  { value: "study-materials", label: "Student Document Library" },
  { value: "events", label: "Faculty Events & MUNs" },
  { value: "internships", label: "Placement & Intern Portal" },
  { value: "societies", label: "Society Hub" },
  { value: "support", label: "Contact System Admin" },
  { value: "seniors", label: "Seniors Connect Hub" },
];

// Default buttons for new setup
const DEFAULT_BUTTONS: Omit<BotButton, "id" | "created_at">[] = [
  {
    label: "Class Schedule",
    icon: "📅",
    action_type: ActionType.MODULE,
    action_value: "schedule",
    row_order: 1,
    button_order: 1,
    active: true,
  },
  {
    label: "Accommodation Help",
    icon: "🏠",
    action_type: ActionType.MODULE,
    action_value: "accommodation",
    row_order: 1,
    button_order: 2,
    active: true,
  },
  {
    label: "Study Material",
    icon: "📚",
    action_type: ActionType.MODULE,
    action_value: "study-materials",
    row_order: 1,
    button_order: 3,
    active: true,
  },
  {
    label: "Notices",
    icon: "📌",
    action_type: ActionType.MODULE,
    action_value: "notices",
    row_order: 2,
    button_order: 1,
    active: true,
  },
  {
    label: "Events",
    icon: "🎭",
    action_type: ActionType.MODULE,
    action_value: "events",
    row_order: 2,
    button_order: 2,
    active: true,
  },
  {
    label: "Internships",
    icon: "💼",
    action_type: ActionType.MODULE,
    action_value: "internships",
    row_order: 2,
    button_order: 3,
    active: true,
  },
  {
    label: "Societies",
    icon: "🏢",
    action_type: ActionType.MODULE,
    action_value: "societies",
    row_order: 3,
    button_order: 1,
    active: true,
  },
  {
    label: "Message Us",
    icon: "💬",
    action_type: ActionType.MODULE,
    action_value: "support",
    row_order: 3,
    button_order: 2,
    active: true,
  },
  {
    label: "Seniors Connect",
    icon: "🎓",
    action_type: ActionType.MODULE,
    action_value: "seniors",
    row_order: 3,
    button_order: 3,
    active: true,
  },
];

export default function BotDesignerPage() {
  const supabase = createClient();
  const [buttons, setButtons] = useState<BotButton[]>([]);
  const [selectedButton, setSelectedButton] = useState<BotButton | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showHiddenButtons, setShowHiddenButtons] = useState(false);

  const fetchButtons = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("bot_buttons")
      .select("*")
      .order("row_order", { ascending: true })
      .order("button_order", { ascending: true });

    if (!error && data && data.length > 0) {
      setButtons(data);
    } else {
      // No buttons exist, use defaults (will be saved on first sync)
      setButtons(
        DEFAULT_BUTTONS.map((b, i) => ({
          ...b,
          id: -(i + 1),
          created_at: "",
        })) as BotButton[],
      );
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchButtons();
  }, [fetchButtons]);

  // Get active buttons only for phone preview
  const activeButtons = buttons.filter((btn) => btn.active);

  // Group active buttons by row for phone preview
  const activeRows = activeButtons
    .reduce((acc, btn) => {
      const rowIndex = btn.row_order - 1;
      if (!acc[rowIndex]) acc[rowIndex] = [];
      acc[rowIndex].push(btn);
      return acc;
    }, [] as BotButton[][])
    .filter((row) => row.length > 0);

  // Group all buttons by row for configuration
  const allRows = buttons.reduce((acc, btn) => {
    const rowIndex = btn.row_order - 1;
    if (!acc[rowIndex]) acc[rowIndex] = [];
    acc[rowIndex].push(btn);
    return acc;
  }, [] as BotButton[][]);

  const updateButton = (id: number, updates: Partial<BotButton>) => {
    setButtons(
      buttons.map((btn) => (btn.id === id ? { ...btn, ...updates } : btn)),
    );
    if (selectedButton?.id === id) {
      setSelectedButton({ ...selectedButton, ...updates });
    }
  };

  const addRow = () => {
    if (allRows.length >= 6) return;
    const newRowOrder = allRows.length + 1;
    const newButton: BotButton = {
      id: -Date.now(),
      label: "New Button",
      icon: "🔘",
      action_type: ActionType.TEXT,
      action_value: "Hello!",
      row_order: newRowOrder,
      button_order: 1,
      active: true,
      created_at: "",
    };
    setButtons([...buttons, newButton]);
  };

  const deleteButton = (id: number) => {
    setButtons(buttons.filter((btn) => btn.id !== id));
    if (selectedButton?.id === id) {
      setSelectedButton(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      // Delete all existing buttons
      await supabase.from("bot_buttons").delete().neq("id", 0);

      // Insert all current buttons
      const buttonsToInsert = buttons.map(
        ({ id: _id, created_at: _created_at, ...rest }) => rest,
      );
      const { error } = await supabase
        .from("bot_buttons")
        .insert(buttonsToInsert);

      if (error) {
        alert("Error saving buttons: " + error.message);
      } else {
        alert("Menu synced! Students will see the new layout.");
        fetchButtons(); // Refresh to get new IDs
      }
    } catch (err) {
      alert("Error syncing: " + err);
    }

    setIsSyncing(false);
  };

  const hiddenButtonsCount = buttons.filter((b) => !b.active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Loading bot configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Bot Designer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Design the Universal Bot menu layout (WhatsApp & Telegram)
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={addRow}
            disabled={allRows.length >= 6}
            className="border-slate-200"
          >
            + Add Row
          </Button>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isSyncing ? "Syncing..." : "Push Changes Live"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Phone Previews */}
        <div className="xl:col-span-7 flex flex-col md:flex-row justify-center gap-6 sticky top-24 overflow-x-auto pb-4 px-2">
          
          {/* Telegram Phone */}
          <div className="relative shrink-0 w-full max-w-[320px] h-[660px] bg-slate-900 rounded-[3rem] border-[12px] border-slate-800 shadow-2xl flex flex-col p-2">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-xl z-20" />

            <div className="flex-1 bg-[#1c242f] rounded-[2.2rem] overflow-hidden flex flex-col">
              {/* Telegram Header */}
              <div className="h-14 bg-[#242f3d] flex items-center px-4 gap-3 border-b border-slate-700/30">
                <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  L
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">
                    Law Faculty Bot
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] text-emerald-400">online</span>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-[#17212b]" />

              {/* Button Layout - Only show ACTIVE buttons */}
              <div className="bg-[#17212b] p-3 space-y-1.5 border-t border-slate-700/50">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center mb-2">
                  Student Menu ({activeButtons.length} visible)
                </div>

                {activeRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1.5">
                    {row
                      .sort((a, b) => a.button_order - b.button_order)
                      .map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => setSelectedButton(btn)}
                          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
                            selectedButton?.id === btn.id
                              ? "bg-slate-700 border-white"
                              : "bg-[#242f3d] border-transparent hover:bg-[#2b394b]"
                          }`}
                        >
                          <span className="text-lg">{btn.icon}</span>
                          <span className="text-[9px] text-white font-medium text-center leading-tight truncate w-full px-0.5">
                            {btn.label}
                          </span>
                        </button>
                      ))}
                  </div>
                ))}

                {activeRows.length === 0 && (
                  <div className="h-24 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-700 rounded-xl">
                    <span className="text-2xl mb-1 opacity-30">⌨️</span>
                    <p className="text-[10px] opacity-40">No visible buttons</p>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div className="h-12 bg-[#242f3d] flex items-center px-3 border-t border-slate-700/50 gap-3">
                <span className="text-slate-500">📎</span>
                <div className="flex-1 h-8 bg-[#17212b] rounded-full flex items-center px-3 border border-slate-700/50">
                  <span className="text-xs text-slate-500">Message...</span>
                </div>
                <span className="text-slate-500">🎙️</span>
              </div>
            </div>

            {/* Home Indicator */}
            <div className="w-24 h-1 bg-slate-700 mx-auto mt-3 rounded-full shrink-0" />
          </div>

          {/* WhatsApp Phone */}
          <div className="relative shrink-0 w-full max-w-[320px] h-[660px] bg-slate-900 rounded-[3rem] border-[12px] border-slate-800 shadow-2xl flex flex-col p-2">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-xl z-20" />

            <div className="flex-1 bg-[#0b141a] rounded-[2.2rem] overflow-hidden flex flex-col relative">
              {/* WhatsApp Header */}
              <div className="h-14 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10 shrink-0">
                <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  L
                </div>
                <div>
                  <span className="text-[15px] font-semibold text-[#e9edef]">
                    Law Faculty Bot
                  </span>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-3 relative overflow-hidden bg-[#0b141a]">
                {/* Chat Bubble (Menu Prompt) */}
                <div className="bg-[#202c33] rounded-lg p-2 max-w-[90%] text-white text-sm shadow-sm relative mb-4">
                  <div className="font-bold text-emerald-400 mb-1">Law Faculty Menu</div>
                  <p className="text-[#e9edef] mb-2 leading-snug">Select a module below to explore class timetables, notices, study materials, societies, and more:</p>
                  <div className="text-[11px] text-[#8696a0] mb-2 mt-1">Law Connect Bot</div>
                  <div className="border-t border-[#313d45] pt-2 mt-1 text-center text-[#53bdeb] font-semibold flex justify-center items-center gap-2">
                    <span className="text-lg leading-none">☰</span> Main Menu
                  </div>
                </div>
              </div>

              {/* WhatsApp List Bottom Sheet (Preview) */}
              <div className="absolute bottom-0 left-0 right-0 bg-[#111b21] rounded-t-3xl flex flex-col max-h-[70%] border-t border-[#313d45] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                <div className="h-12 flex items-center justify-center border-b border-[#2a3942] font-semibold text-[#e9edef] shrink-0">
                  Main Menu
                </div>
                <div className="flex-1 overflow-y-auto p-0 pb-6 custom-scrollbar">
                  <div className="px-5 py-3 text-[#00a884] font-semibold text-xs uppercase tracking-wider">
                    Explore Modules
                  </div>
                  {activeButtons.slice(0, 10).map((btn, index) => (
                    <div 
                      key={btn.id} 
                      className={`flex items-center gap-4 px-5 py-3 hover:bg-[#202c33] transition-colors cursor-pointer ${selectedButton?.id === btn.id ? 'bg-[#202c33]' : ''}`}
                      onClick={() => setSelectedButton(btn)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[#e9edef] font-medium text-[16px] truncate">{btn.icon} {btn.label}</div>
                      </div>
                      <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[#8696a0] flex items-center justify-center"></div>
                    </div>
                  ))}
                  {activeButtons.length > 10 && (
                    <div className="px-5 py-4 text-amber-500 text-xs italic text-center border-t border-[#2a3942] mt-2">
                      ⚠️ WhatsApp supports max 10 items.<br/>({activeButtons.length - 10} items will be hidden)
                    </div>
                  )}
                  {activeButtons.length === 0 && (
                    <div className="p-6 text-center text-[#8696a0] text-sm">No active items</div>
                  )}
                </div>
              </div>
            </div>

            {/* Home Indicator */}
            <div className="w-24 h-1 bg-slate-700 mx-auto mt-3 rounded-full shrink-0" />
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="xl:col-span-5 space-y-6">
          {selectedButton ? (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${selectedButton.active ? "bg-slate-100" : "bg-slate-200 opacity-50"}`}
                    >
                      {selectedButton.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Edit Button
                        {!selectedButton.active && (
                          <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded">
                            Hidden
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure this menu item
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteButton(selectedButton.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <Label
                      htmlFor="visibility"
                      className="text-sm font-medium text-slate-700"
                    >
                      Button Visibility
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedButton.active
                        ? "Visible to students"
                        : "Hidden from students"}
                    </p>
                  </div>
                  <Switch
                    id="visibility"
                    checked={selectedButton.active}
                    onCheckedChange={(checked) =>
                      updateButton(selectedButton.id, { active: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Button Label
                  </label>
                  <Input
                    value={selectedButton.label}
                    onChange={(e) =>
                      updateButton(selectedButton.id, { label: e.target.value })
                    }
                    placeholder="Button text"
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Icon (Emoji)
                    </label>
                    <Input
                      value={selectedButton.icon || ""}
                      onChange={(e) =>
                        updateButton(selectedButton.id, {
                          icon: e.target.value,
                        })
                      }
                      maxLength={2}
                      className="bg-slate-50 border-slate-200 text-center text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Action Type
                    </label>
                    <Select
                      value={selectedButton.action_type}
                      onValueChange={(value) =>
                        updateButton(selectedButton.id, {
                          action_type: value as ActionType,
                        })
                      }
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MODULE">Internal Module</SelectItem>
                        <SelectItem value="URL">External Link</SelectItem>
                        <SelectItem value="TEXT">Quick Message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Action Destination
                  </label>
                  {selectedButton.action_type === ActionType.MODULE ? (
                    <Select
                      value={selectedButton.action_value}
                      onValueChange={(value) =>
                        updateButton(selectedButton.id, { action_value: value })
                      }
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={selectedButton.action_value}
                      onChange={(e) =>
                        updateButton(selectedButton.id, {
                          action_value: e.target.value,
                        })
                      }
                      placeholder={
                        selectedButton.action_type === ActionType.URL
                          ? "https://example.com"
                          : "Message text..."
                      }
                      className="bg-slate-50 border-slate-200"
                    />
                  )}
                </div>

                <Button
                  onClick={() => setSelectedButton(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    📱
                  </div>
                  <h4 className="text-lg font-semibold text-slate-700">
                    Select a Button
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                    Tap any button on the phone preview to edit its
                    configuration.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {allRows.length}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Rows
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {activeButtons.length}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Visible
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-400">
                      {hiddenButtonsCount}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Hidden
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* All Buttons List with visibility controls */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">All Buttons</CardTitle>
                {hiddenButtonsCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHiddenButtons(!showHiddenButtons)}
                    className="text-xs"
                  >
                    {showHiddenButtons ? "Hide" : "Show"} Hidden (
                    {hiddenButtonsCount})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {buttons
                .filter((btn) => showHiddenButtons || btn.active)
                .sort(
                  (a, b) =>
                    a.row_order - b.row_order ||
                    a.button_order - b.button_order,
                )
                .map((btn) => (
                  <div
                    key={btn.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", btn.id.toString());
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = parseInt(e.dataTransfer.getData("text/plain"));
                      const targetId = btn.id;
                      if (sourceId && sourceId !== targetId) {
                        const sourceBtn = buttons.find((b) => b.id === sourceId);
                        const targetBtn = buttons.find((b) => b.id === targetId);
                        if (sourceBtn && targetBtn) {
                          setButtons(
                            buttons.map((b) => {
                              if (b.id === sourceId) return { ...b, row_order: targetBtn.row_order, button_order: targetBtn.button_order };
                              if (b.id === targetId) return { ...b, row_order: sourceBtn.row_order, button_order: sourceBtn.button_order };
                              return b;
                            })
                          );
                        }
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                      selectedButton?.id === btn.id
                        ? "border-slate-400 bg-slate-50"
                        : btn.active
                          ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          : "border-slate-100 bg-slate-50 opacity-60"
                    }`}
                    onClick={() => setSelectedButton(btn)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-300 cursor-grab px-1 hover:text-slate-500">
                        <span className="text-lg">⋮⋮</span>
                      </div>
                      <span className="text-xl">{btn.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {btn.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Row {btn.row_order} • Position {btn.button_order}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={btn.active}
                        onCheckedChange={(checked) => {
                          updateButton(btn.id, { active: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}

              {buttons.length === 0 && (
                <p className="text-center text-slate-400 py-4">
                  No buttons configured
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
