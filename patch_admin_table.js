const fs = require('fs');
let code = fs.readFileSync('frontend/app/(dashboard)/admin-allocation/page.tsx', 'utf8');

const roleCellStart = `<TableCell>
                          <Badge
                            variant="outline"
                            className={\`font-normal \${
                              admin.role === AdminRole.SUPER_ADMIN
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }\`}
                          >
                            {admin.role?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>`;
const newRoleCell = `<TableCell>
                          {admin.role === AdminRole.SUPER_ADMIN ? (
                            <Badge
                              variant="outline"
                              className="font-normal bg-amber-50 text-amber-700 border-amber-200"
                            >
                              SUPER ADMIN
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {admin.allocated_modules?.length ? (
                                admin.allocated_modules.map((mod) => (
                                  <Badge key={mod} variant="outline" className="font-normal bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                                    {mod.replace(/_/g, " ").toUpperCase()}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">No modules</span>
                              )}
                            </div>
                          )}
                        </TableCell>`;

code = code.replace(roleCellStart, newRoleCell);
fs.writeFileSync('frontend/app/(dashboard)/admin-allocation/page.tsx', code, 'utf8');
