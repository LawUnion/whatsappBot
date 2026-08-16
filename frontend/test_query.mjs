import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://cmcdnrghkpihoytnjvbn.supabase.co";
const supabaseKey = "sb_publishable_p6laug0WlbWGXj4AgF5gQQ_PAV-IUXT";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const t1 = await supabase.from("notices").select("id", { count: "exact", head: true });
  console.log("notices count:", t1.count);
  const t2 = await supabase.from("study_materials").select("id", { count: "exact", head: true });
  console.log("study_materials count:", t2.count);
  const t3 = await supabase.from("events").select("id", { count: "exact", head: true });
  console.log("events count:", t3.count);
}
check();
