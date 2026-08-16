import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const q1 = await supabase.from("notices").select("id, title, file_url, target_colleges, created_at, admin:admins(name)").not("file_url", "is", null);
  console.log("notices error:", q1.error?.message || "none");
  
  const q2 = await supabase.from("study_materials").select("id, subject, topic, file_url, target_colleges, created_at, admin:admins(name)").not("file_url", "is", null);
  console.log("study_materials error:", q2.error?.message || "none");

  const q3 = await supabase.from("schedule_notes").select("id, subject, topic, file_url, created_at, admin:admins(name)").not("file_url", "is", null);
  console.log("schedule_notes error:", q3.error?.message || "none");
}
check();
