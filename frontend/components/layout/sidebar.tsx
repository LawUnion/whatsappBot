"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminRole, type Admin } from "@/lib/types";

interface SidebarProps {
  admin: Admin | null;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles?: AdminRole[];
}

interface NavSection {
  label: string;
  items: NavItem[];
  roles?: AdminRole[];
}

const navSections: NavSection[] = [
  {
    label: "",
    items: [{ title: "Dashboard", href: "/", icon: "📊" }],
  },
  {
    label: "MASTER ADMIN",
    roles: [AdminRole.SUPER_ADMIN],
    items: [
      { title: "Admin Allocation", href: "/admin-allocation", icon: "🔑" },
      { title: "Bot Settings", href: "/bot-settings", icon: "🤖" },
      { title: "Bot Designer", href: "/bot-designer", icon: "📱" },
      { title: "Student Roster", href: "/student-roster", icon: "📋" },
      {
        title: "Pending Approvals",
        href: "/students",
        icon: "👨‍🎓",
        roles: [AdminRole.SUPER_ADMIN],
      },
      {
        title: "Content Approvals",
        href: "/content-approvals",
        icon: "✅",
        roles: [AdminRole.SUPER_ADMIN],
      },
    ],
  },
  {
    label: "STRUCTURE",
    roles: [AdminRole.SUPER_ADMIN],
    items: [
      { title: "Academic Structure", href: "/academic-structure", icon: "🏫" },
      { title: "Content Master", href: "/documents", icon: "📁" },
    ],
  },
  {
    label: "MODULES",
    items: [
      {
        title: "Class Timetable",
        href: "/class-schedule",
        icon: "📅",
        roles: [AdminRole.SUPER_ADMIN, AdminRole.SECTION_ADMIN],
      },
      {
        title: "Notices",
        href: "/notices",
        icon: "📢",
        roles: [
          AdminRole.SUPER_ADMIN,
          AdminRole.NOTICES_ADMIN,
          AdminRole.COLLEGE_CONTENT_ADMIN,
        ],
      },
      {
        title: "Societies",
        href: "/societies",
        icon: "🏢",
        roles: [AdminRole.SUPER_ADMIN, AdminRole.SOCIETIES_ADMIN],
      },
      {
        title: "Study Materials",
        href: "/study-materials",
        icon: "📚",
        roles: [
          AdminRole.SUPER_ADMIN,
          AdminRole.STUDY_MATERIAL_ADMIN,
          AdminRole.SECTION_ADMIN,
        ],
      },
      {
        title: "Events",
        href: "/events",
        icon: "🎭",
        roles: [
          AdminRole.SUPER_ADMIN,
          AdminRole.EVENTS_ADMIN,
          AdminRole.SOCIETIES_ADMIN,
          AdminRole.COLLEGE_CONTENT_ADMIN,
        ],
      },
      {
        title: "Internships",
        href: "/internships",
        icon: "💼",
        roles: [AdminRole.SUPER_ADMIN, AdminRole.INTERNSHIP_ADMIN, AdminRole.COLLEGE_CONTENT_ADMIN],
      },
    ],
  },
  {
    label: "COMMUNICATION",
    items: [
      {
        title: "Push Broadcast",
        href: "/push-messages",
        icon: "🔔",
        roles: [AdminRole.SUPER_ADMIN],
      },
      {
        title: "Support Inbox",
        href: "/support",
        icon: "📩",
        roles: [AdminRole.SUPER_ADMIN],
      },
      {
        title: "Activity Logs",
        href: "/logs",
        icon: "📜",
        roles: [AdminRole.SUPER_ADMIN],
      },
    ],
  },
];

export function Sidebar({ admin, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const getFilteredSections = () => {
    if (!admin) return [];

    return navSections
      .filter((section) => {
        if (section.roles && !section.roles.includes(admin.role)) {
          return false;
        }
        return true;
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!item.roles) return true;
          return item.roles.includes(admin.role);
        }),
      }))
      .filter((section) => section.items.length > 0);
  };

  const filteredSections = getFilteredSections();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 text-slate-300 flex flex-col shadow-2xl",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center text-xl">
              ⚖️
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">LawAdmin</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Faculty of Law
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <span className="text-lg">{isCollapsed ? "→" : "←"}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {/* Section Label */}
            {section.label && !isCollapsed && (
              <div className="pt-5 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section.label}
              </div>
            )}
            {section.label && isCollapsed && (
              <div className="my-3 border-t border-slate-800" />
            )}

            {/* Section Items */}
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50",
                  )}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      {admin && (
        <div className="p-4 border-t border-slate-800">
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center",
            )}
          >
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {admin.name?.charAt(0) || "A"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {admin.name}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-bold truncate">
                  {admin.role.replace(/_/g, " ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
