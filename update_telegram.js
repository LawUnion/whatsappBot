const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'supabase/functions/telegram-webhook/index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace Notices query
content = content.replace(
  /const { data: notices } = await supabase\n\s*\.from\("notices"\)\n\s*\.select\("\*"\)\n\s*\.eq\("approval_status", "approved"\)\n\s*\.or\(`college_id\.is\.null,college_id\.eq\.\$\{student\.college_id\}`\)\n\s*\.order\("created_at", { ascending: false }\)\n\s*\.limit\(30\);/g,
  `const { data: allNotices } = await supabase
    .from("notices")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
    
  const notices = allNotices?.filter(n => {
    if (n.target_colleges && n.target_colleges.length > 0) {
      return n.target_colleges.includes(student.college_id);
    }
    return true;
  }).slice(0, 30) || [];`
);

// Replace Events query
content = content.replace(
  /const { data: events } = await supabase\n\s*\.from\("events"\)\n\s*\.select\("id, title, event_date, location, event_types\\(name\\)"\)\n\s*\.eq\("approval_status", "approved"\)\n\s*\.gte\("event_date", new Date\(\)\.toISOString\(\)\)\n\s*\.or\(`college_id\.is\.null,college_id\.eq\.\$\{student\.college_id\}`\)\n\s*\.order\("event_date", { ascending: true }\)\n\s*\.limit\(30\);/g,
  `const { data: allEvents } = await supabase
    .from("events")
    .select("id, title, event_date, location, target_colleges, event_types(name)")
    .eq("approval_status", "approved")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(100);
    
  const events = allEvents?.filter(e => {
    if (e.target_colleges && e.target_colleges.length > 0) {
      return e.target_colleges.includes(student.college_id);
    }
    return true;
  }).slice(0, 30) || [];`
);

// Replace Study Materials query
content = content.replace(
  /const { data: materials } = await supabase\n\s*\.from\("study_materials"\)\n\s*\.select\("\*"\)\n\s*\.or\(`college_id\.is\.null,college_id\.eq\.\$\{student\.college_id\}`\)\n\s*\.order\("created_at", { ascending: false }\)\n\s*\.limit\(30\);/g,
  `const { data: allMaterials } = await supabase
    .from("study_materials")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
    
  const materials = allMaterials?.filter(m => {
    if (m.target_colleges && m.target_colleges.length > 0) {
      return m.target_colleges.includes(student.college_id);
    }
    return true;
  }).slice(0, 30) || [];`
);

fs.writeFileSync(filePath, content);
console.log('Updated telegram webhook');
