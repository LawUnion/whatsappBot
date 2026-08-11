const fs = require('fs');
let code = fs.readFileSync('frontend/app/(dashboard)/admin-allocation/page.tsx', 'utf8');

// Replace state variables
code = code.replace(
  `const [newRole, setNewRole] = useState<AdminRole>(AdminRole.SECTION_ADMIN);`,
  `const [newRole, setNewRole] = useState<AdminRole>(AdminRole.SUB_ADMIN);
  const [newAllocatedModules, setNewAllocatedModules] = useState<string[]>([]);`
);

// Replace resetForm
code = code.replace(
  `setNewRole(AdminRole.SECTION_ADMIN);`,
  `setNewRole(AdminRole.SUB_ADMIN);\n    setNewAllocatedModules([]);`
);

// Replace openEditDialog
code = code.replace(
  `setNewRole(admin.role || AdminRole.SECTION_ADMIN);`,
  `setNewRole(admin.role || AdminRole.SUB_ADMIN);\n    setNewAllocatedModules(admin.allocated_modules || []);`
);

// Replace handleCreate payload
code = code.replace(
  `const payload = {
      name: newName,
      email: newEmail,
      role: newRole,
      college_id: newCollegeId ? parseInt(newCollegeId) : null,
      year_id: newYearId ? parseInt(newYearId) : null,
      section_id: newSectionId ? parseInt(newSectionId) : null,
      society_id: newSocietyId ? parseInt(newSocietyId) : null,
    };`,
  `const payload = {
      name: newName,
      email: newEmail,
      role: newRole,
      allocated_modules: newAllocatedModules,
      college_id: newCollegeId ? parseInt(newCollegeId) : null,
      year_id: newYearId ? parseInt(newYearId) : null,
      section_id: newSectionId ? parseInt(newSectionId) : null,
      society_id: newSocietyId ? parseInt(newSocietyId) : null,
    };`
);

// Fix visibility logic
code = code.replace(
  `const showCollege = [
    AdminRole.SECTION_ADMIN,
    AdminRole.NOTICES_ADMIN,
    AdminRole.SOCIETIES_ADMIN,
    AdminRole.STUDY_MATERIAL_ADMIN,
    AdminRole.EVENTS_ADMIN,
    AdminRole.INTERNSHIP_ADMIN,
    AdminRole.COLLEGE_CONTENT_ADMIN,
  ].includes(newRole);`,
  `const showCollege = newRole === AdminRole.SUB_ADMIN;`
);

code = code.replace(
  `const showYear = [
    AdminRole.SECTION_ADMIN,
    AdminRole.STUDY_MATERIAL_ADMIN,
  ].includes(newRole);`,
  `const showYear = newRole === AdminRole.SUB_ADMIN && (newAllocatedModules.includes("class_schedule") || newAllocatedModules.includes("study_materials"));`
);

code = code.replace(
  `const showSection = newRole === AdminRole.SECTION_ADMIN;`,
  `const showSection = newRole === AdminRole.SUB_ADMIN && newAllocatedModules.includes("class_schedule");`
);

code = code.replace(
  `const showSociety = newRole === AdminRole.SOCIETIES_ADMIN;`,
  `const showSociety = newRole === AdminRole.SUB_ADMIN && newAllocatedModules.includes("societies");`
);

// In the UI, the Select for Role needs to just be SUPER_ADMIN or SUB_ADMIN.
// Also add checkboxes for Modules.
const roleSelectStart = `<div className="space-y-2">\n              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">\n                Role\n              </label>`;
const roleSelectEnd = `</SelectContent>\n              </Select>\n            </div>`;
const newRoleSelectAndModules = `<div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Role
              </label>
              <Select
                value={newRole}
                onValueChange={(v) => {
                  setNewRole(v as AdminRole);
                  if (v === AdminRole.SUPER_ADMIN) {
                    setNewAllocatedModules([]);
                    setNewCollegeId("");
                    setNewYearId("");
                    setNewSectionId("");
                    setNewSocietyId("");
                  }
                }}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AdminRole.SUPER_ADMIN}>SUPER ADMIN</SelectItem>
                  <SelectItem value={AdminRole.SUB_ADMIN}>SUB ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRole === AdminRole.SUB_ADMIN && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Allocated Modules
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "notices", label: "Notices" },
                    { id: "events", label: "Events" },
                    { id: "societies", label: "Societies" },
                    { id: "study_materials", label: "Study Materials" },
                    { id: "internships", label: "Internships" },
                    { id: "class_schedule", label: "Class Schedule" },
                  ].map((mod) => (
                    <label key={mod.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50 bg-white">
                      <input
                        type="checkbox"
                        checked={newAllocatedModules.includes(mod.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAllocatedModules([...newAllocatedModules, mod.id]);
                          } else {
                            setNewAllocatedModules(newAllocatedModules.filter(m => m !== mod.id));
                          }
                        }}
                        className="rounded text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm font-medium text-slate-700">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}`;

const roleStartIndex = code.indexOf(roleSelectStart);
const roleEndIndex = code.indexOf(roleSelectEnd) + roleSelectEnd.length;

if (roleStartIndex !== -1 && roleEndIndex !== -1) {
  code = code.substring(0, roleStartIndex) + newRoleSelectAndModules + code.substring(roleEndIndex);
}

fs.writeFileSync('frontend/app/(dashboard)/admin-allocation/page.tsx', code, 'utf8');
