const fs = require('fs');
let code = fs.readFileSync('frontend/components/layout/sidebar.tsx', 'utf8');

// Replace NavItem interface
code = code.replace(
  `interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: AdminRole[];
}`,
  `interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: AdminRole[];
  moduleId?: string;
}`
);

// We need to replace the MODULES section inside navSections
const oldModulesRegex = /\{\n\s*label: "MODULES",[\s\S]*?\},/m;
const newModules = `{
    label: "MODULES",
    items: [
      {
        title: "Class Timetable",
        href: "/class-schedule",
        icon: Calendar,
        moduleId: "class_schedule",
      },
      {
        title: "Notices",
        href: "/notices",
        icon: Megaphone,
        moduleId: "notices",
      },
      {
        title: "Societies",
        href: "/societies",
        icon: Building,
        moduleId: "societies",
      },
      {
        title: "Study Materials",
        href: "/study-materials",
        icon: BookOpen,
        moduleId: "study_materials",
      },
      {
        title: "Events",
        href: "/events",
        icon: Theater,
        moduleId: "events",
      },
      {
        title: "Internships",
        href: "/internships",
        icon: Briefcase,
        moduleId: "internships",
      },
    ],
  },`;
code = code.replace(oldModulesRegex, newModules);

// Now update getFilteredSections
const oldFilterLogic = `  const getFilteredSections = () => {
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
  };`;
const newFilterLogic = `  const getFilteredSections = () => {
    if (!admin) return [];

    return navSections
      .filter((section) => {
        // Master Admin / Structure / Communication require SUPER_ADMIN
        if (section.roles && !section.roles.includes(admin.role)) {
          return false;
        }
        return true;
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // If item specifically requires a role, check it
          if (item.roles && !item.roles.includes(admin.role)) return false;
          
          // If it requires a module, check if admin is SUPER_ADMIN or has the module
          if (item.moduleId) {
            if (admin.role === AdminRole.SUPER_ADMIN) return true;
            if (!admin.allocated_modules) return false;
            return admin.allocated_modules.includes(item.moduleId);
          }
          
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  };`;
code = code.replace(oldFilterLogic, newFilterLogic);

// Wait, the COMMUNICATION section items have roles: [AdminRole.SUPER_ADMIN].
// The STRUCTURE section has roles: [AdminRole.SUPER_ADMIN] on the section itself.
// But some COMMUNICATION items have roles: [AdminRole.SUPER_ADMIN] on the item, but the section doesn't have it.
// The new logic correctly handles both.

fs.writeFileSync('frontend/components/layout/sidebar.tsx', code, 'utf8');
