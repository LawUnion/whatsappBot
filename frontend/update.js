const fs = require('fs');
const path = require('path');

const files = [
  'app/(dashboard)/notices/page.tsx',
  'app/(dashboard)/events/page.tsx',
  'app/(dashboard)/study-materials/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace useState
  content = content.replace(
    /const \[newCollegeId, setNewCollegeId\] = useState<string>\("all"\);/g,
    'const [newTargetColleges, setNewTargetColleges] = useState<number[]>([]);'
  );

  // Replace useEffect
  content = content.replace(
    /useEffect\(\(\) => {\s*if \(!adminLoading && admin && adminCollegeId\) {\s*setFilterCollege\(adminCollegeId\.toString\(\)\);\s*setNewCollegeId\(adminCollegeId\.toString\(\)\);\s*}\s*}, \[adminLoading, admin, adminCollegeId\]\);/g,
    `useEffect(() => {
    if (!adminLoading && admin && adminCollegeId) {
      setFilterCollege(adminCollegeId.toString());
      setNewTargetColleges([adminCollegeId]);
    } else if (!adminLoading && colleges.length > 0 && newTargetColleges.length === 0) {
      setNewTargetColleges(colleges.map((c) => c.id));
    }
  }, [adminLoading, admin, adminCollegeId, colleges]);

  const toggleCollege = (id: number) => {
    setNewTargetColleges((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };`
  );

  // Replace payload logic
  content = content.replace(
    /if \(newCollegeId && newCollegeId !== "all"\) {\s*payload\.college_id = parseInt\(newCollegeId\);\s*}/g,
    `if (newTargetColleges.length > 0 && newTargetColleges.length < colleges.length) {
      payload.target_colleges = newTargetColleges;
    }`
  );

  // Replace resetForm
  content = content.replace(
    /setNewCollegeId\("all"\);/g,
    'setNewTargetColleges(colleges.map((c) => c.id));'
  );

  // Replace JSX block
  // This is a bit tricky with regex, we can just find the start and end
  const jsxStartStr = '{/* Target College - only show selector if admin has access to multiple colleges */}';
  const jsxEndStr = ') : null}';
  const startIndex = content.indexOf(jsxStartStr);
  if (startIndex !== -1) {
    const endIndex = content.indexOf(jsxEndStr, startIndex);
    if (endIndex !== -1) {
      const originalBlock = content.substring(startIndex, endIndex + jsxEndStr.length);
      const replacementBlock = `{/* Target Colleges */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Target Colleges
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {scopedColleges.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCollege(c.id)}
                        className={\`px-3 py-2.5 flex-1 min-w-[80px] text-xs font-semibold border rounded-lg transition-all \${
                          newTargetColleges.includes(c.id)
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                        }\`}
                      >
                        {c.code || c.name}
                      </button>
                    ))}
                  </div>
                </div>`;
      content = content.replace(originalBlock, replacementBlock);
    }
  } else {
    console.log(`Could not find JSX block in ${file}`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
